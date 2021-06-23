import * as commonUrl from "../common/url";
import * as d from "../data";
import * as main from "../core/main";
import * as util from "../core/util";
import { listDeleteAt, listSetAt } from "../common/util";

describe("url", () => {
  it("https://definy.app/ is Home in English", () => {
    expect<d.UrlData>(
      commonUrl.urlDataAndAccountTokenFromUrl(new URL("https://definy.app/"))
        .urlData
    ).toEqual<d.UrlData>({
      location: d.Location.Home,
      language: "English",
    });
  });
  it("project url", () => {
    expect<d.UrlData>(
      commonUrl.urlDataAndAccountTokenFromUrl(
        new URL(
          "https://definy.app/project/580d8d6a54cf43e4452a0bba6694a4ed?hl=ja"
        )
      ).urlData
    ).toEqual<d.UrlData>({
      location: d.Location.Project(
        "580d8d6a54cf43e4452a0bba6694a4ed" as d.ProjectId
      ),
      language: "Japanese",
    });
  });
  it("account page", () => {
    const url = new URL(
      "http://localhost:2520/account/580d8d6a54cf43e4452a0bba6694a4ed?hl=eo#account-token=f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0"
    );
    expect<d.UrlData>(
      commonUrl.urlDataAndAccountTokenFromUrl(url).urlData
    ).toEqual<d.UrlData>({
      location: d.Location.Account(
        "580d8d6a54cf43e4452a0bba6694a4ed" as d.AccountId
      ),
      language: "Esperanto",
    });
  });
  it("account token", () => {
    const url = new URL(
      "http://localhost:2520/account/580d8d6a54cf43e4452a0bba6694a4ed?hl=eo#account-token=f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0"
    );
    expect<d.Maybe<d.AccountToken>>(
      commonUrl.urlDataAndAccountTokenFromUrl(url).accountToken
    ).toEqual(
      d.Maybe.Just(
        "f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0" as d.AccountToken
      )
    );
  });
  it("encode, decode user url", () => {
    const languageAndLocation: d.UrlData = {
      location: d.Location.Account(
        "580d8d6a54cf43e4452a0bba6694a4ed" as d.AccountId
      ),
      language: "Esperanto",
    };
    const url = commonUrl.urlDataAndAccountTokenToUrl(
      languageAndLocation,
      d.Maybe.Nothing()
    );
    const decodedLanguageAndLocation: d.UrlData =
      commonUrl.urlDataAndAccountTokenFromUrl(url).urlData;
    expect(languageAndLocation).toEqual(decodedLanguageAndLocation);
  });
});

describe("data", () => {
  it("dateTime and js Date conversion", () => {
    const sampleDateTime: d.Time = util.timeFromDate(
      new Date(2015, 3, 21, 14, 46, 3, 1234)
    );
    expect(sampleDateTime).toEqual(
      util.timeFromDate(util.timeToDate(sampleDateTime))
    );
  });

  it("stringToTypePartName", () => {
    expect(
      util.stringToTypePartName("Definy is web  app! for.web::App")
    ).toEqual("definyIsWebAppForWebApp");
  });

  it("dynamic Evaluation: simple expr", () => {
    /*
     * = (add 50) ((add 32) 100)
     */
    const result = main.evaluateSuggestionExpr(
      {
        typePartMap: new Map(),
        partMap: new Map(),
        evaluatedPartMap: new Map(),
        evaluatedSuggestionPartMap: new Map(),
      },
      d.Expr.FunctionCall({
        function: d.Expr.FunctionCall({
          function: d.Expr.Kernel("Int32Add"),
          parameter: d.Expr.Int32Literal(50),
        }),
        parameter: d.Expr.FunctionCall({
          function: d.Expr.FunctionCall({
            function: d.Expr.Kernel("Int32Add"),
            parameter: d.Expr.Int32Literal(32),
          }),
          parameter: d.Expr.Int32Literal(100),
        }),
      })
    );
    expect(result).toEqual(d.Result.Ok(d.EvaluatedExpr.Int32(182)));
  });

  it("dynamic Evaluation: use part definition", () => {
    /*
     * [0]
     * one = 1
     *
     * [1]
     * addOneHundred = + 100
     *
     *
     * = (add (addOneHundred one)) one
     */
    const intType: d.Type = {
      typePartId: "int" as d.TypePartId,
      parameter: [],
    };
    const oneName = "0" as d.PartId;
    const addOneHundredName = "1" as d.PartId;
    const result = main.evaluateSuggestionExpr(
      {
        typePartMap: new Map(),
        partMap: new Map<d.PartId, d.Part>([
          [
            oneName,
            {
              name: "one",
              description: "1を表す",
              type: intType,
              expr: d.Expr.Int32Literal(1),
              projectId: "sampleProject" as d.ProjectId,
            },
          ],
          [
            addOneHundredName,
            {
              name: "addOneHundred",
              description: "100を足す関数",
              type: intType,
              expr: d.Expr.FunctionCall({
                function: d.Expr.Kernel("Int32Add"),
                parameter: d.Expr.Int32Literal(100),
              }),
              projectId: "sampleProject" as d.ProjectId,
            },
          ],
        ]),
        evaluatedSuggestionPartMap: new Map(),
        evaluatedPartMap: new Map(),
      },
      d.Expr.FunctionCall({
        function: d.Expr.FunctionCall({
          function: d.Expr.Kernel("Int32Add"),
          parameter: d.Expr.FunctionCall({
            function: d.Expr.PartReference(addOneHundredName),
            parameter: d.Expr.PartReference(oneName),
          }),
        }),
        parameter: d.Expr.PartReference(oneName),
      })
    );
    expect(result).toEqual(d.Result.Ok(d.EvaluatedExpr.Int32(102)));
  });
  it("util lower case", () => {
    expect(util.isFirstLowerCaseName("value")).toEqual(true);
  });
});

describe("binary codec", () => {
  const codecEqual = <T>(value: T, codec: d.Codec<T>): void => {
    expect(value).toEqual(
      codec.decode(0, new Uint8Array(codec.encode(value))).result
    );
  };
  it("int32 codec", () => {
    codecEqual(123, d.Int32.codec);
  });
  it("int32 min codec", () => {
    codecEqual(-(2 ** 31), d.Int32.codec);
  });
  it("boolean true codec", () => {
    codecEqual(true, d.Bool.codec);
  });
  it("boolean false codec", () => {
    codecEqual(false, d.Bool.codec);
  });
  it("string ascii codec", () => {
    codecEqual("sample text", d.String.codec);
  });
  it("strong japanese emoji codec", () => {
    codecEqual("やったぜ😀👨‍👩‍👧‍👦", d.String.codec);
  });
  it("maybe string codec", () => {
    codecEqual(d.Maybe.Just("それな"), d.Maybe.codec(d.String.codec));
  });
  it("list number codec", () => {
    codecEqual(
      [1, 43, 6423, 334, 663, 0, 74, -1, -29031, 2 ** 31 - 1],
      d.List.codec(d.Int32.codec)
    );
  });
  it("token codec", () => {
    codecEqual(
      "24b6b3789d903e841490ac04ffc2b6f9848ea529b2d9db380d190583b09995e6" as d.AccountToken,
      d.AccountToken.codec
    );
  });
  it("id codec", () => {
    codecEqual(
      "756200c85a0ff28f08daa2d201d616a9" as d.AccountId,
      d.AccountId.codec
    );
  });
  it("user codec", () => {
    codecEqual(
      {
        id: "933055412132d6aa46f8dde7159ecb38" as d.AccountId,
        name: "ナルミンチョ",
        createTime: { day: 18440, millisecond: 12000 },
        imageHash:
          "0a8eed336ca61252c13da0ff0b82ce37e81b84622a4052ab33693c434b4f6434" as d.ImageHash,
        introduction: "ナルミンチョはDefinyを作っている人です.",
      },
      d.Account.codec
    );
  });
  it("Maybe Account codec", () => {
    codecEqual<d.Maybe<d.Account>>(
      d.Maybe.Just({
        id: "933055412132d6aa46f8dde7159ecb38" as d.AccountId,
        name: "ナルミンチョ",
        createTime: { day: 18440, millisecond: 12000 },
        imageHash:
          "0a8eed336ca61252c13da0ff0b82ce37e81b84622a4052ab33693c434b4f6434" as d.ImageHash,
        introduction: "ナルミンチョはDefinyを作っている人です.",
      }),
      d.Maybe.codec(d.Account.codec)
    );
  });
  it("util listDeleteAt center", () => {
    expect(listDeleteAt(["あ", "い", "う", "え", "お"], 1)).toEqual([
      "あ",
      "う",
      "え",
      "お",
    ]);
  });
  it("util listDeleteAt first", () => {
    expect(listDeleteAt(["あ", "い", "う", "え", "お"], 0)).toEqual([
      "い",
      "う",
      "え",
      "お",
    ]);
  });
  it("util listDeleteAt last", () => {
    expect(listDeleteAt(["あ", "い", "う", "え", "お"], 4)).toEqual([
      "あ",
      "い",
      "う",
      "え",
    ]);
  });
  it("util listDeleteAt out of index", () => {
    expect(listDeleteAt(["あ", "い", "う"], 3)).toEqual(["あ", "い", "う"]);
  });
  it("util listSetAt center", () => {
    expect(listSetAt(["あ", "い", "う"], 1, "それな")).toEqual([
      "あ",
      "それな",
      "う",
    ]);
  });
  it("util listSetAt first", () => {
    expect(listSetAt(["あ", "い", "う"], 0, "それな")).toEqual([
      "それな",
      "い",
      "う",
    ]);
  });
  it("util listSetAt last", () => {
    expect(listSetAt(["あ", "い", "う"], 2, "それな")).toEqual([
      "あ",
      "い",
      "それな",
    ]);
  });
  it("util listSetAt out of index", () => {
    expect(listSetAt(["あ", "い", "う"], 3, "それな")).toEqual([
      "あ",
      "い",
      "う",
    ]);
  });
});

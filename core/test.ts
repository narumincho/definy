import * as data from "./data";
import * as main from "./main";
import * as util from "./util";
import { strict as strictAssert } from "assert";

const codecEqual = <T>(
  value: T,
  codec: data.Codec<T>,
  message: string
): void => {
  strictAssert.deepEqual(
    value,
    codec.decode(0, new Uint8Array(codec.encode(value))).result,
    message
  );
};

{
  const sampleDateTime: data.Time = util.timeFromDate(
    new Date(2015, 3, 21, 14, 46, 3, 1234)
  );
  strictAssert.deepEqual(
    sampleDateTime,
    util.timeFromDate(util.timeToDate(sampleDateTime)),
    "dateTime and js Date conversion"
  );
}

strictAssert.deepEqual(
  util.stringToTypePartName("Definy is web  app! for.web::App"),
  "definyIsWebAppForWebApp",
  "stringToTypePartName"
);

{
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
    data.Expr.FunctionCall({
      function: data.Expr.FunctionCall({
        function: data.Expr.Kernel("Int32Add"),
        parameter: data.Expr.Int32Literal(50),
      }),
      parameter: data.Expr.FunctionCall({
        function: data.Expr.FunctionCall({
          function: data.Expr.Kernel("Int32Add"),
          parameter: data.Expr.Int32Literal(32),
        }),
        parameter: data.Expr.Int32Literal(100),
      }),
    })
  );
  strictAssert.deepEqual(
    result,
    data.Result.Ok(data.EvaluatedExpr.Int32(182)),
    "dynamic Evaluation: simple expr"
  );
}

{
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
  const intType: data.Type = {
    typePartId: "int" as data.TypePartId,
    parameter: [],
  };
  const oneName = "0" as data.PartId;
  const addOneHundredName = "1" as data.PartId;
  const result = main.evaluateSuggestionExpr(
    {
      typePartMap: new Map(),
      partMap: new Map<data.PartId, data.Part>([
        [
          oneName,
          {
            name: "one",
            description: "1を表す",
            type: intType,
            expr: data.Expr.Int32Literal(1),
            projectId: "sampleProject" as data.ProjectId,
          },
        ],
        [
          addOneHundredName,
          {
            name: "addOneHundred",
            description: "100を足す関数",
            type: intType,
            expr: data.Expr.FunctionCall({
              function: data.Expr.Kernel("Int32Add"),
              parameter: data.Expr.Int32Literal(100),
            }),
            projectId: "sampleProject" as data.ProjectId,
          },
        ],
      ]),
      evaluatedSuggestionPartMap: new Map(),
      evaluatedPartMap: new Map(),
    },
    data.Expr.FunctionCall({
      function: data.Expr.FunctionCall({
        function: data.Expr.Kernel("Int32Add"),
        parameter: data.Expr.FunctionCall({
          function: data.Expr.PartReference(addOneHundredName),
          parameter: data.Expr.PartReference(oneName),
        }),
      }),
      parameter: data.Expr.PartReference(oneName),
    })
  );
  strictAssert.deepEqual(
    result,
    data.Result.Ok(data.EvaluatedExpr.Int32(102)),
    "dynamic Evaluation: use part definition"
  );
}

strictAssert.deepEqual(
  util.isFirstLowerCaseName("value"),
  true,
  "util lower case"
);

codecEqual(123, data.Int32.codec, "int32 codec");

codecEqual(-(2 ** 31), data.Int32.codec, "int32 min codec");

codecEqual(true, data.Bool.codec, "boolean true codec");

codecEqual(false, data.Bool.codec, "boolean false codec");

codecEqual("sample text", data.String.codec, "string ascii codec");

codecEqual("やったぜ😀👨‍👩‍👧‍👦", data.String.codec, "strong japanese emoji codec");

codecEqual(
  data.Maybe.Just("それな"),
  data.Maybe.codec(data.String.codec),
  "maybe string codec"
);

codecEqual(
  [1, 43, 6423, 334, 663, 0, 74, -1, -29031, 2 ** 31 - 1],
  data.List.codec(data.Int32.codec),
  "list number codec"
);

codecEqual(
  "24b6b3789d903e841490ac04ffc2b6f9848ea529b2d9db380d190583b09995e6" as data.AccountToken,
  data.AccountToken.codec,
  "token codec"
);

codecEqual(
  "756200c85a0ff28f08daa2d201d616a9" as data.AccountId,
  data.AccountId.codec,
  "id codec"
);

codecEqual(
  {
    name: "ナルミンチョ",
    createTime: { day: 18440, millisecond: 12000 },
    imageHash: "0a8eed336ca61252c13da0ff0b82ce37e81b84622a4052ab33693c434b4f6434" as data.ImageHash,
    introduction: "ナルミンチョはDefinyを作っている人です.",
  },
  data.Account.codec,
  "user codec"
);

codecEqual<data.Maybe<data.IdAndData<data.AccountId, data.Account>>>(
  data.Maybe.Just({
    id: "933055412132d6aa46f8dde7159ecb38" as data.AccountId,
    data: {
      name: "ナルミンチョ",
      createTime: { day: 18440, millisecond: 12000 },
      imageHash: "0a8eed336ca61252c13da0ff0b82ce37e81b84622a4052ab33693c434b4f6434" as data.ImageHash,
      introduction: "ナルミンチョはDefinyを作っている人です.",
    },
  }),
  data.Maybe.codec(
    data.IdAndData.codec(data.AccountId.codec, data.Account.codec)
  ),
  "Maybe (IdAndData UserId User) codec"
);

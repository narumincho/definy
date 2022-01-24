import * as data from "../localData";
import { elm } from "../gen/main";

describe("test", () => {
  it("type name validation valid", () => {
    expect(elm.elmTypeNameFromString("Data")).toEqual<
      data.Maybe<data.ElmTypeName>
    >(data.Maybe.Just(data.ElmTypeName.ElmTypeName("Data")));
  });

  it("type name validation invalid", () => {
    expect(elm.elmTypeNameFromString("それな")).toEqual<
      data.Maybe<data.ElmTypeName>
    >(data.Maybe.Nothing());
  });

  it("output variant", () => {
    const colorTypeName = elm.elmTypeNameFromString("Color");
    switch (colorTypeName._) {
      case "Just": {
        const sampleElmCode: data.ElmCode = {
          moduleName: "Main",
          typeDeclarationList: [
            data.ElmTypeDeclaration.CustomType({
              name: colorTypeName.value,
              export: data.ElmCustomTypeExportLevel.ExportTypeAndVariant,
              comment: "色",
              parameter: [],
              variantList: [
                {
                  name: elm.variantNameFormStringOrThrow("Red"),
                  parameter: [],
                },
                {
                  name: elm.variantNameFormStringOrThrow("Green"),
                  parameter: [],
                },
                {
                  name: elm.variantNameFormStringOrThrow("Blue"),
                  parameter: [],
                },
              ],
            }),
          ],
        };
        expect(elm.codeToString(sampleElmCode)).toMatchInlineSnapshot(`
          "module Main exposing (Color(..))



          {-| 色
          -}
          type Color
              = Red
              | Green
              | Blue
          "
        `);
        return;
      }
      case "Nothing":
        fail();
    }
  });

  it("output type alias", () => {
    const sampleElmCode: data.ElmCode = {
      moduleName: "Main",
      typeDeclarationList: [
        data.ElmTypeDeclaration.TypeAlias({
          name: elm.elmTypeNameFromStringOrThrow("User"),
          export: false,
          comment: "色",
          parameter: [],
          type: data.ElmType.Record([
            {
              name: elm.fieldNameFromStringOrThrow("name"),
              type: elm.String,
            },
            {
              name: elm.fieldNameFromStringOrThrow("age"),
              type: elm.Int,
            },
          ]),
        }),
      ],
    };
    expect(elm.codeToString(sampleElmCode)).toMatchInlineSnapshot(`
      "module Main exposing ()

      import String
      import Basics

      {-| 色
      -}
      type alias User =
          { name : String.String, age : Basics.Int }
      "
    `);
  });

  it("invalid filed name", () => {
    expect(() => {
      const sampleElmCode: data.ElmCode = {
        moduleName: "Main",
        typeDeclarationList: [
          data.ElmTypeDeclaration.TypeAlias({
            name: elm.elmTypeNameFromStringOrThrow("IncludeInvalidFiledName"),
            export: false,
            comment: "",
            parameter: [],
            type: data.ElmType.Record([
              {
                name: elm.fieldNameFromStringOrThrow("then"),
                type: elm.String,
              },
            ]),
          }),
        ],
      };

      elm.codeToString(sampleElmCode);
    }).toThrowErrorMatchingInlineSnapshot(`"invalid field name = then"`);
  });

  it("output (List Int) -> String", () => {
    const sampleElmCode: data.ElmCode = {
      moduleName: "Main",
      typeDeclarationList: [
        data.ElmTypeDeclaration.TypeAlias({
          name: elm.elmTypeNameFromStringOrThrow("IntListToString"),
          export: false,
          comment: "List Int -> Stringの型",
          parameter: [],
          type: data.ElmType.Function({
            input: data.ElmType.List(elm.Int),
            output: elm.String,
          }),
        }),
      ],
    };
    expect(elm.codeToString(sampleElmCode)).toMatchInlineSnapshot(`
      "module Main exposing ()

      import String

      {-| List Int -> Stringの型
      -}
      type alias IntListToString =
          ((List Basics.Int) -> String.String)
      "
    `);
  });

  it("output type parameter", () => {
    const sampleCode: data.ElmCode = {
      moduleName: "Main",
      typeDeclarationList: [
        data.ElmTypeDeclaration.TypeAlias({
          name: elm.elmTypeNameFromStringOrThrow("WithParameter"),
          export: false,
          comment: "型パラメーターがつくもの",
          parameter: ["element"],
          type: data.ElmType.Record([
            {
              name: elm.fieldNameFromStringOrThrow("field"),
              type: data.ElmType.TypeParameter("element"),
            },
          ]),
        }),
      ],
    };
    expect(elm.codeToString(sampleCode)).toMatchInlineSnapshot(`
      "module Main exposing ()



      {-| 型パラメーターがつくもの
      -}
      type alias WithParameter element =
          { field : element }
      "
    `);
  });
});

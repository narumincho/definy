import * as data from "../data";
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
        expect(elm.codeToString(sampleElmCode)).toMatchSnapshot();
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
    expect(elm.codeToString(sampleElmCode)).toMatchSnapshot();
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
    }).toThrowErrorMatchingSnapshot();
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
    expect(elm.codeToString(sampleElmCode)).toMatchSnapshot();
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
    expect(elm.codeToString(sampleCode)).toMatchSnapshot();
  });
});

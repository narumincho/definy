import {
  data,
  identifierFromString,
  memberKeyValue,
  stringLiteral,
} from "../../jsTs/main.ts";
import { Namespace } from "../core/coreType.ts";
import { namespaceFromAndToToTypeScriptModuleName } from "./namespace.ts";

const resultTypeName = identifierFromString("Result");

export const resultExportDefinition: data.ExportDefinition = {
  type: "typeAlias",
  typeAlias: {
    namespace: [],
    name: resultTypeName,
    document: "取得した結果",
    typeParameterList: [
      identifierFromString("ok"),
      identifierFromString("error"),
    ],
    type: {
      _: "Union",
      tsTypeList: [
        {
          _: "Object",
          tsMemberTypeList: [
            {
              name: { type: "string", value: "type" },
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "ok" },
            },
            {
              name: { type: "string", value: "ok" },
              document: "",
              required: true,
              type: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("ok"),
                  arguments: [],
                },
              },
            },
          ],
        },
        {
          _: "Object",
          tsMemberTypeList: [
            {
              name: { type: "string", value: "type" },
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "error" },
            },
            {
              name: { type: "string", value: "error" },
              document: "",
              required: true,
              type: {
                _: "ScopeInFile",
                typeNameAndTypeParameter: {
                  name: identifierFromString("error"),
                  arguments: [],
                },
              },
            },
          ],
        },
      ],
    },
  },
};

export const resultType = (
  ok: data.TsType,
  error: data.TsType,
  namespace: Namespace,
): data.TsType => {
  const moduleName = namespaceFromAndToToTypeScriptModuleName(
    namespace,
    Namespace.maybe,
  );
  if (moduleName === undefined) {
    return ({
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: resultTypeName,
        arguments: [ok, error],
      },
    });
  }
  return ({
    _: "ImportedType",
    importedType: {
      moduleName,
      nameAndArguments: {
        name: resultTypeName,
        arguments: [ok, error],
      },
    },
  });
};

export const resultOk = (ok: data.TsExpr): data.TsExpr => ({
  _: "ObjectLiteral",
  tsMemberList: [
    memberKeyValue("type", stringLiteral("ok")),
    memberKeyValue("ok", ok),
  ],
});

export const resultError = (error: data.TsExpr): data.TsExpr => ({
  _: "ObjectLiteral",
  tsMemberList: [
    memberKeyValue("type", stringLiteral("error")),
    memberKeyValue("error", error),
  ],
});

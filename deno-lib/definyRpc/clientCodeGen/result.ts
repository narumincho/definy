import { data, identifierFromString } from "../../jsTs/main.ts";

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
              name: "type",
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "ok" },
            },
            {
              name: "ok",
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
              name: "type",
              document: "",
              required: true,
              type: { _: "StringLiteral", string: "error" },
            },
            {
              name: "error",
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
): data.TsType => ({
  _: "ScopeInFile",
  typeNameAndTypeParameter: {
    name: resultTypeName,
    arguments: [ok, error],
  },
});

export const resultOk = (ok: data.TsExpr): data.TsExpr => ({
  _: "ObjectLiteral",
  tsMemberList: [
    {
      _: "KeyValue",
      keyValue: { key: "type", value: { _: "StringLiteral", string: "ok" } },
    },
    {
      _: "KeyValue",
      keyValue: { key: "ok", value: ok },
    },
  ],
});

export const resultError = (error: data.TsExpr): data.TsExpr => ({
  _: "ObjectLiteral",
  tsMemberList: [
    {
      _: "KeyValue",
      keyValue: { key: "type", value: { _: "StringLiteral", string: "error" } },
    },
    {
      _: "KeyValue",
      keyValue: { key: "error", value: error },
    },
  ],
});

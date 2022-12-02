import {
  data,
  identifierFromString,
  lambdaToType,
  memberKeyValue,
  readonlyArrayType,
  readonlyMapType,
  readonlySetType,
  stringLiteral,
  symbolToStringTag,
  urlType,
} from "../../jsTs/main.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  CollectedDefinyRpcTypeBody,
  CollectedDefinyRpcTypeMap,
} from "../core/collectType.ts";
import { arrayFromLength } from "../../util.ts";
import { structuredJsonValueType } from "./useTypedJson.ts";
import {
  createFromLambda,
  symbolToStringTagAndTypeName,
} from "./typeVariable/from.ts";
import {
  collectedDefinyRpcTypeToTsType,
  collectedDefinyRpcTypeUseToTsType,
} from "./type/use.ts";
import { createTagExprList } from "./typeVariable/tag.ts";
import { createFromStructuredJsonValueLambda } from "./typeVariable/fromStructuredJsonValue.ts";
import { Namespace } from "../core/coreType.ts";

export const collectedTypeToTypeAlias = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.TypeAlias | undefined => {
  const tsType = collectedDefinyRpcTypeBodyToTsType(
    type.namespace,
    type.name,
    type.body,
    context,
  );
  if (
    tsType === undefined ||
    type.body.type === "string" ||
    type.body.type === "number" ||
    type.body.type === "boolean" ||
    type.body.type === "unit" ||
    type.body.type === "list" ||
    type.body.type === "set" || type.body.type === "map"
  ) {
    return undefined;
  }
  return {
    namespace: [],
    name: identifierFromString(type.name),
    document: type.description,
    typeParameterList: arrayFromLength(
      type.parameterCount,
      (i) => identifierFromString("p" + i),
    ),
    type: tsType,
  };
};

const collectedDefinyRpcTypeBodyToTsType = (
  namespace: Namespace,
  typeName: string,
  typeBody: CollectedDefinyRpcTypeBody,
  context: CodeGenContext,
): data.TsType | undefined => {
  switch (typeBody.type) {
    case "string":
    case "number":
    case "boolean":
    case "unit":
    case "list":
    case "set":
    case "map":
    case "url":
      return undefined;
    case "product":
      return {
        _: "Object",
        tsMemberTypeList: [
          ...typeBody.fieldList.map((field) => ({
            name: { type: "string", value: field.name } as const,
            document: field.description,
            required: true,
            type: collectedDefinyRpcTypeUseToTsType(field.type, context),
          })),
          {
            name: {
              type: "symbolExpr",
              value: symbolToStringTag,
            },
            document: "",
            required: true,
            type: {
              _: "StringLiteral",
              string: symbolToStringTagAndTypeName(namespace, typeName),
            },
          },
        ],
      };
    case "sum":
      return {
        _: "Union",
        tsTypeList: typeBody.patternList.map(
          (pattern): data.TsType => ({
            _: "Object",
            tsMemberTypeList: [
              {
                name: {
                  type: "string",
                  value: identifierFromString("type"),
                },
                document: pattern.description,
                required: true,
                type: { _: "StringLiteral", string: pattern.name },
              },
              ...(pattern.parameter === undefined ? [] : [
                {
                  name: {
                    type: "string",
                    value: identifierFromString("value"),
                  },
                  document: pattern.description,
                  required: true,
                  type: collectedDefinyRpcTypeUseToTsType(
                    pattern.parameter,
                    context,
                  ),
                } as const,
              ]),
              {
                name: {
                  type: "symbolExpr",
                  value: symbolToStringTag,
                },
                document: "",
                required: true,
                type: {
                  _: "StringLiteral",
                  string: symbolToStringTagAndTypeName(namespace, typeName),
                },
              },
            ],
          }),
        ),
      };
  }
};

export const typeToTypeVariable = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.Variable => {
  const fromJsonTypeMain: data.TsType = {
    _: "Function",
    functionType: {
      typeParameterList: [],
      parameterList: [structuredJsonValueType(context)],
      return: collectedDefinyRpcTypeToTsType(type, context),
    },
  };
  const fromLambda = createFromLambda(type, context);
  const tagList = createTagExprList(type, context) ?? [];
  return {
    name: identifierFromString(type.name),
    document: type.description,
    type: {
      _: "Object",
      tsMemberTypeList: [
        {
          name: { type: "string", value: "description" },
          document: `${type.name} の説明文`,
          required: true,
          type: { _: "String" },
        },
        ...(fromLambda === undefined ? [] : [{
          name: { type: "string", value: "from" } as const,
          document: "オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない",
          required: true,
          type: lambdaToType(fromLambda),
        }]),
        {
          name: { type: "string", value: "fromStructuredJsonValue" },
          document: `Jsonから${type.name}に変換する. 失敗した場合はエラー`,
          required: true,
          type: type.parameterCount === 0 ? fromJsonTypeMain : {
            _: "Function",
            functionType: {
              parameterList: arrayFromLength(
                type.parameterCount,
                (i): data.TsType => ({
                  _: "Function",
                  functionType: {
                    parameterList: [structuredJsonValueType(context)],
                    typeParameterList: [],
                    return: {
                      _: "ScopeInFile",
                      typeNameAndTypeParameter: {
                        name: identifierFromString("p" + i),
                        arguments: [],
                      },
                    },
                  },
                }),
              ),
              return: fromJsonTypeMain,
              typeParameterList: arrayFromLength(
                type.parameterCount,
                (i) => identifierFromString("p" + i),
              ),
            },
          },
        },
        ...tagList.map((tag) => tag.memberType),
      ],
    },
    expr: {
      _: "ObjectLiteral",
      tsMemberList: [
        memberKeyValue(
          "description",
          stringLiteral(type.description),
        ),
        ...(fromLambda === undefined ? [] : [
          memberKeyValue(
            "from",
            {
              _: "Lambda",
              lambdaExpr: fromLambda,
            },
          ),
        ]),
        memberKeyValue(
          "fromStructuredJsonValue",
          {
            _: "Lambda",
            lambdaExpr: createFromStructuredJsonValueLambda(type, context),
          },
        ),
        ...tagList.map((tag) => tag.member),
      ],
    },
  };
};

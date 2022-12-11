import {
  data,
  identifierFromString,
  lambdaToType,
  memberKeyValue,
  symbolToStringTag,
  variable,
} from "../../jsTs/main.ts";
import { CodeGenContext } from "../core/collectType.ts";
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
import { DefinyRpcTypeInfo, TypeAttribute } from "../core/coreType.ts";
import { createTypeLambda } from "./typeVariable/type.ts";

export const collectedTypeToTypeAlias = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.TypeAlias | undefined => {
  const tsType = collectedDefinyRpcTypeBodyToTsType(
    type,
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
    typeParameterList: type.attribute.type === "just" &&
        type.attribute.value.type === TypeAttribute.asType.type
      ? [identifierFromString("p0")]
      : arrayFromLength(
        type.parameterCount,
        (i) => identifierFromString("p" + i),
      ),
    type: tsType,
  };
};

const typeSymbolMember: data.TsMemberType = {
  name: {
    type: "symbolExpr",
    value: variable(identifierFromString("neverSymbol")),
  },
  document: "",
  required: true,
  type: {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: identifierFromString("p0"),
      arguments: [],
    },
  },
};

const collectedDefinyRpcTypeBodyToTsType = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): data.TsType | undefined => {
  switch (type.body.type) {
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
          ...type.body.value.map((field) => ({
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
              string: symbolToStringTagAndTypeName(type.namespace, type.name),
            },
          },
          ...(type.attribute.type === "just" &&
              type.attribute.value.type === TypeAttribute.asType.type
            ? [typeSymbolMember]
            : []),
        ],
      };
    case "sum":
      return {
        _: "Union",
        tsTypeList: type.body.value.map(
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
              ...(pattern.parameter.type === "nothing" ? [] : [
                {
                  name: {
                    type: "string",
                    value: identifierFromString("value"),
                  },
                  document: pattern.description,
                  required: true,
                  type: collectedDefinyRpcTypeUseToTsType(
                    pattern.parameter.value,
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
                  string: symbolToStringTagAndTypeName(
                    type.namespace,
                    type.name,
                  ),
                },
              },
            ],
          }),
        ),
      };
  }
};

export const typeToTypeVariable = (
  type: DefinyRpcTypeInfo,
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
  const typeLambda = createTypeLambda(type, context);

  return {
    name: identifierFromString(type.name),
    document: type.description,
    type: {
      _: "Object",
      tsMemberTypeList: [
        {
          name: { type: "string", value: "type" },
          document: `${type.name} の型`,
          required: true,
          type: lambdaToType(typeLambda),
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
        memberKeyValue("type", { _: "Lambda", lambdaExpr: typeLambda }),
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

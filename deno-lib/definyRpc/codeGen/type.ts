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
  collectedDefinyRpcTypeMapGet,
  CollectedDefinyRpcTypeUse,
} from "../core/collectType.ts";
import { arrayFromLength } from "../../util.ts";
import { structuredJsonValueType } from "./useTypedJson.ts";
import {
  createFromLambda,
  symbolToStringTagAndTypeName,
} from "./typeVariable/from.ts";
import { collectedDefinyRpcTypeToTsType } from "./type/use.ts";
import { createTagExprList } from "./typeVariable/tag.ts";
import { createFromStructuredJsonValueLambda } from "./typeVariable/fromStructuredJsonValue.ts";
import { Namespace } from "../core/coreType.ts";

export const collectedTypeToTypeAlias = (
  type: CollectedDefinyRpcType,
  map: CollectedDefinyRpcTypeMap,
): data.TypeAlias | undefined => {
  const tsType = collectedDefinyRpcTypeBodyToTsType(
    type.namespace,
    type.name,
    type.body,
    map,
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
  map: CollectedDefinyRpcTypeMap,
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
            type: collectedDefinyRpcTypeUseToTsType(field.type, map),
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
                    map,
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

const collectedDefinyRpcTypeUseToTsType = (
  collectedDefinyRpcTypeUse: CollectedDefinyRpcTypeUse,
  map: CollectedDefinyRpcTypeMap,
): data.TsType => {
  const typeDetail = collectedDefinyRpcTypeMapGet(
    map,
    collectedDefinyRpcTypeUse.namespace,
    collectedDefinyRpcTypeUse.name,
  );
  if (typeDetail === undefined) {
    throw new Error("型を集計できなかった " + collectedDefinyRpcTypeUse.name);
  }
  switch (typeDetail.body.type) {
    case "string":
      return { _: "String" };
    case "boolean":
      return { _: "Boolean" };
    case "number":
      return { _: "Number" };
    case "unit":
      return { _: "Undefined" };
    case "list": {
      const parameter = collectedDefinyRpcTypeUse.parameters[0];
      if (
        parameter === undefined ||
        collectedDefinyRpcTypeUse.parameters.length !== 1
      ) {
        throw new Error(
          "list need 1 parameters but got " +
            collectedDefinyRpcTypeUse.parameters.length,
        );
      }
      return readonlyArrayType(
        collectedDefinyRpcTypeUseToTsType(parameter, map),
      );
    }
    case "set": {
      const parameter = collectedDefinyRpcTypeUse.parameters[0];
      if (
        parameter === undefined ||
        collectedDefinyRpcTypeUse.parameters.length !== 1
      ) {
        throw new Error(
          "set need 1 parameters but got " +
            collectedDefinyRpcTypeUse.parameters.length,
        );
      }
      return readonlySetType(collectedDefinyRpcTypeUseToTsType(parameter, map));
    }
    case "map": {
      const [key, value] = collectedDefinyRpcTypeUse.parameters;
      if (
        key === undefined || value === undefined ||
        collectedDefinyRpcTypeUse.parameters.length !== 2
      ) {
        throw new Error(
          "map need 2 parameters but got " +
            collectedDefinyRpcTypeUse.parameters.length,
        );
      }
      return readonlyMapType(
        collectedDefinyRpcTypeUseToTsType(key, map),
        collectedDefinyRpcTypeUseToTsType(value, map),
      );
    }
    case "url":
      return urlType;
    case "product":
    case "sum":
      return {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: identifierFromString(collectedDefinyRpcTypeUse.name),
          arguments: collectedDefinyRpcTypeUse.parameters.map((use) =>
            collectedDefinyRpcTypeUseToTsType(use, map)
          ),
        },
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

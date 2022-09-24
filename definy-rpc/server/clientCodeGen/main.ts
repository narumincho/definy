import { ApiFunction } from "../apiFunction.ts";
import { generateCodeAsString } from "../jsTs/main.ts";
import { identifierFromString } from "../jsTs/identifier.ts";
import { ExportDefinition, JsTsCode } from "../jsTs/data.ts";
import { collectDefinyRpcTypeFromFuncList } from "../collectType.ts";
import { formatCode } from "../prettier.ts";
import { apiFuncToTsFunction } from "./func.ts";
import { resultExportDefinition } from "./result.ts";
import { collectedTypeToTypeAlias, typeToTypeVariable } from "./type.ts";

export const apiFunctionListToCode = (
  apiFunctionList: ReadonlyArray<ApiFunction>,
  originHint: string,
  usePrettier: boolean
): string => {
  const code = generateCodeAsString(
    apiFunctionListToJsTsCode(apiFunctionList, originHint),
    "TypeScript"
  );
  if (usePrettier) {
    return formatCode(code);
  }
  return code;
};

export const apiFunctionListToJsTsCode = (
  apiFunctionList: ReadonlyArray<ApiFunction>,
  originHint: string
): JsTsCode => {
  const needAuthentication = apiFunctionList.some(
    (func) => func.needAuthentication
  );
  const collectedTypeMap = collectDefinyRpcTypeFromFuncList(apiFunctionList);
  return {
    exportDefinitionList: [
      resultExportDefinition,
      ...(needAuthentication ? [accountTokenExportDefinition] : []),
      ...[...collectedTypeMap.values()].flatMap(
        (type): ReadonlyArray<ExportDefinition> => {
          const typeAlias = collectedTypeToTypeAlias(type, collectedTypeMap);
          if (typeAlias === undefined) {
            return [];
          }
          return [{ type: "typeAlias", typeAlias }];
        }
      ),
      ...[...collectedTypeMap.values()].map(
        (type): ExportDefinition => ({
          type: "variable",
          variable: typeToTypeVariable(type, collectedTypeMap),
        })
      ),
      ...apiFunctionList.map<ExportDefinition>((func) => ({
        type: "function",
        function: apiFuncToTsFunction(func, originHint),
      })),
    ],
    statementList: [],
  };
};

const accountTokenExportDefinition: ExportDefinition = {
  type: "typeAlias",
  typeAlias: {
    namespace: [],
    name: identifierFromString("AccountToken"),
    document: "認証が必要なリクエストに使用する",
    typeParameterList: [],
    type: {
      _: "Intersection",
      intersectionType: {
        left: { _: "String" },
        right: {
          _: "Object",
          tsMemberTypeList: [
            {
              name: "__accountTokenBland",
              document: "",
              required: true,
              type: { _: "Never" },
            },
          ],
        },
      },
    },
  },
};

export const runtimeCode = `export type RawJsonValue =
  | null
  | string
  | number
  | boolean
  | {
      readonly [K in string]: RawJsonValue;
    }
  | ReadonlyArray<RawJsonValue>;

export type StructuredJsonValue =
  | { readonly type: "null" }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | {
      readonly type: "object";
      readonly value: ReadonlyMap<string, StructuredJsonValue>;
    }
  | {
      readonly type: "array";
      readonly value: ReadonlyArray<StructuredJsonValue>;
    };

export const jsonParse = (value: string): RawJsonValue | undefined => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("json のパースエラー", e);
    return undefined;
  }
};

export const structuredJsonParse = (
  value: string
): StructuredJsonValue | undefined => {
  const rawJson = jsonParse(value);
  if (rawJson === undefined) {
    return undefined;
  }
  return rawJsonToStructuredJsonValue(rawJson);
};

export const rawJsonToStructuredJsonValue = (
  rawJson: RawJsonValue
): StructuredJsonValue => {
  if (rawJson === null) {
    return { type: "null" };
  }
  if (typeof rawJson === "boolean") {
    return { type: "boolean", value: rawJson };
  }
  if (typeof rawJson === "string") {
    return { type: "string", value: rawJson };
  }
  if (typeof rawJson === "number") {
    return { type: "number", value: rawJson };
  }
  if (rawJson instanceof Array) {
    return { type: "array", value: rawJson.map(rawJsonToStructuredJsonValue) };
  }
  return {
    type: "object",
    value: new Map(
      Object.entries(rawJson).map(([k, v]) => [
        k,
        rawJsonToStructuredJsonValue(v),
      ])
    ),
  };
};

export const jsonStringify = (jsonValue: RawJsonValue): string => {
  return JSON.stringify(jsonValue);
};
`;

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

export const runtimeCode = `
export type JsonValue =
  | null
  | string
  | number
  | boolean
  | {
      readonly [K in string]?: JsonValue;
    }
  | ReadonlyArray<JsonValue>;

export const jsonParse = (value: string): JsonValue | undefined => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("json のパースエラー", e);
    return undefined;
  }
};

export const jsonStringify = (jsonValue: JsonValue): string => {
  return JSON.stringify(jsonValue);
};
`;

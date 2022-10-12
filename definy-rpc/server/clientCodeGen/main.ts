import { ApiFunction } from "../apiFunction.ts";
import {
  generateCodeAsString,
  identifierFromString,
  data,
} from "../../../deno-lib/jsTs/main.ts";
import { collectDefinyRpcTypeFromFuncList } from "../collectType.ts";
import { formatCode } from "../prettier.ts";
import { apiFuncToTsFunction } from "./func.ts";
import { resultExportDefinition } from "./result.ts";
import { collectedTypeToTypeAlias, typeToTypeVariable } from "./type.ts";

export { runtimeCode } from "./runtime.ts";

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
): data.JsTsCode => {
  const needAuthentication = apiFunctionList.some(
    (func) => func.needAuthentication
  );
  const collectedTypeMap = collectDefinyRpcTypeFromFuncList(apiFunctionList);
  return {
    exportDefinitionList: [
      resultExportDefinition,
      ...(needAuthentication ? [accountTokenExportDefinition] : []),
      ...[...collectedTypeMap.values()].flatMap(
        (type): ReadonlyArray<data.ExportDefinition> => {
          const typeAlias = collectedTypeToTypeAlias(type, collectedTypeMap);
          if (typeAlias === undefined) {
            return [];
          }
          return [{ type: "typeAlias", typeAlias }];
        }
      ),
      ...[...collectedTypeMap.values()].map(
        (type): data.ExportDefinition => ({
          type: "variable",
          variable: typeToTypeVariable(type, collectedTypeMap),
        })
      ),
      ...apiFunctionList.map<data.ExportDefinition>((func) => ({
        type: "function",
        function: apiFuncToTsFunction(func, originHint),
      })),
    ],
    statementList: [],
  };
};

const accountTokenExportDefinition: data.ExportDefinition = {
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

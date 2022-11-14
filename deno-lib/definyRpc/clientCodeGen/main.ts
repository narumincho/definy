import { ApiFunction } from "../core/apiFunction.ts";
import {
  data,
  generateCodeAsString,
  identifierFromString,
} from "../../jsTs/main.ts";
import { collectDefinyRpcTypeFromFuncList } from "../core/collectType.ts";
import { formatCode } from "../../prettier.ts";
import { apiFuncToTsFunction } from "./func.ts";
import { resultExportDefinition } from "./result.ts";
import { collectedTypeToTypeAlias, typeToTypeVariable } from "./type.ts";

export const apiFunctionListToCode = (parameter: {
  readonly apiFunctionList: ReadonlyArray<ApiFunction>;
  readonly originHint: string;
  readonly pathPrefix: ReadonlyArray<string>;
  readonly usePrettier: boolean;
}): string => {
  const code = generateCodeAsString(
    apiFunctionListToJsTsCode(parameter),
    "TypeScript",
  );
  if (parameter.usePrettier) {
    return formatCode(code);
  }
  return code;
};

export const apiFunctionListToJsTsCode = (parameter: {
  readonly apiFunctionList: ReadonlyArray<ApiFunction>;
  readonly originHint: string;
  readonly pathPrefix: ReadonlyArray<string>;
}): data.JsTsCode => {
  const needAuthentication = parameter.apiFunctionList.some(
    (func) => func.needAuthentication,
  );
  const collectedTypeMap = collectDefinyRpcTypeFromFuncList(
    parameter.apiFunctionList,
  );
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
        },
      ),
      ...[...collectedTypeMap.values()].map(
        (type): data.ExportDefinition => ({
          type: "variable",
          variable: typeToTypeVariable(type, collectedTypeMap),
        }),
      ),
      ...parameter.apiFunctionList.map<data.ExportDefinition>((func) => ({
        type: "function",
        function: apiFuncToTsFunction({
          func,
          originHint: parameter.originHint,
          pathPrefix: parameter.pathPrefix,
        }),
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

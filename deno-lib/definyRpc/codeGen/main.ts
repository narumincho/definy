import { ApiFunction } from "../core/apiFunction.ts";
import {
  data,
  generateCodeAsString,
  identifierFromString,
} from "../../jsTs/main.ts";
import {
  collectDefinyRpcTypeFromFuncList,
  CollectedDefinyRpcType,
} from "../core/collectType.ts";
import { formatCode } from "../../prettier.ts";
import { apiFuncToTsFunction } from "./func.ts";
import { collectedTypeToTypeAlias, typeToTypeVariable } from "./type.ts";
import { stringArrayEqual } from "../../util.ts";
import { definyRpcNamespace } from "../core/definyRpcNamespace.ts";
import { definyRpcExportDefinitionList } from "./definyRpc.ts";

export const apiFunctionListToCode = (parameter: {
  readonly apiFunctionList: ReadonlyArray<ApiFunction>;
  readonly originHint: string;
  readonly pathPrefix: ReadonlyArray<string>;
  readonly usePrettier: boolean;
  readonly namespace: ReadonlyArray<string>;
  readonly typeList: ReadonlyArray<CollectedDefinyRpcType>;
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
  readonly namespace: ReadonlyArray<string>;
  readonly typeList: ReadonlyArray<CollectedDefinyRpcType>;
}): data.JsTsCode => {
  const needAuthentication = parameter.apiFunctionList.some(
    (func) => func.needAuthentication,
  );
  const collectedTypeMap = new Map<string, CollectedDefinyRpcType>([
    ...collectDefinyRpcTypeFromFuncList(
      parameter.apiFunctionList,
    ),
    ...parameter.typeList.map((
      t,
    ): [string, CollectedDefinyRpcType] => [
      t.namespace.join(".") + "." + t.name,
      t,
    ]),
  ]);
  return {
    exportDefinitionList: [
      ...(stringArrayEqual(parameter.namespace, [definyRpcNamespace])
        ? definyRpcExportDefinitionList
        : []),
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
          variable: typeToTypeVariable(type, {
            map: collectedTypeMap,
            currentModule: parameter.namespace,
          }),
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
              name: { type: "string", value: "__accountTokenBland" },
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

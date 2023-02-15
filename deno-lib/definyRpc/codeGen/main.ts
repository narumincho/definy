import { ApiFunction } from "../core/apiFunction.ts";
import {
  data,
  generateCodeAsString,
  identifierFromString,
} from "../../jsTs/main.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcTypeMap,
} from "../core/collectType.ts";
import { formatCode } from "../../prettier.ts";
import { apiFuncToTsFunction } from "./func.ts";
import { collectedTypeToTypeAlias, typeToTypeVariable } from "./type.ts";
import { namespaceEqual } from "./namespace.ts";
import { DefinyRpcTypeInfo, Namespace } from "../core/coreType.ts";

/**
 * 指定した名前空間のコードを生成する
 */
export const generateCodeInNamespace = (parameter: {
  readonly apiFunctionList: ReadonlyArray<ApiFunction>;
  readonly originHint: string;
  readonly usePrettier: boolean;
  readonly namespace: Namespace;
  readonly typeMap: CollectedDefinyRpcTypeMap;
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
  readonly namespace: Namespace;
  readonly typeMap: CollectedDefinyRpcTypeMap;
}): data.JsTsCode => {
  const needAuthentication = parameter.apiFunctionList.some(
    (func) => func.needAuthentication,
  );

  const context: CodeGenContext = {
    map: parameter.typeMap,
    currentModule: parameter.namespace,
  };

  const typeListInNamespace: ReadonlyArray<DefinyRpcTypeInfo> = [
    ...parameter.typeMap,
  ].flatMap(
    ([_, typeInfo]) => {
      if (namespaceEqual(typeInfo.namespace, parameter.namespace)) {
        return [typeInfo];
      }
      return [];
    },
  );

  return {
    exportDefinitionList: [
      ...(needAuthentication ? [accountTokenExportDefinition] : []),
      ...typeListInNamespace.flatMap(
        (type): ReadonlyArray<data.ExportDefinition> => {
          const typeAlias = collectedTypeToTypeAlias(type, context);
          if (typeAlias === undefined) {
            return [];
          }
          return [{ type: "typeAlias", typeAlias }];
        },
      ),
      ...typeListInNamespace.map(
        (type): data.ExportDefinition => ({
          type: "variable",
          variable: typeToTypeVariable(type, context),
        }),
      ),
      ...parameter.apiFunctionList.map<data.ExportDefinition>((func) => ({
        type: "function",
        function: apiFuncToTsFunction({
          func,
          originHint: parameter.originHint,
          context,
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

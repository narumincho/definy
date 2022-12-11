import { namespaceToString } from "../codeGen/namespace.ts";
import { DefinyRpcTypeInfo, Namespace } from "./coreType.ts";

export type CollectedDefinyRpcTypeMap = ReadonlyMap<
  string,
  DefinyRpcTypeInfo
>;

export type CodeGenContext = {
  readonly map: CollectedDefinyRpcTypeMap;
  readonly currentModule: Namespace;
};

export const createTypeKey = (
  namespace: Namespace,
  typeName: string,
): string => {
  return namespaceToString(namespace) + "." + typeName;
};

export const collectedDefinyRpcTypeMapGet = (
  map: CollectedDefinyRpcTypeMap,
  namespace: Namespace,
  typeName: string,
): DefinyRpcTypeInfo => {
  const typeInfo = map.get(createTypeKey(namespace, typeName));
  if (typeInfo === undefined) {
    throw new Error(
      "type (" + createTypeKey(namespace, typeName) + ") not found",
    );
  }
  return typeInfo;
};

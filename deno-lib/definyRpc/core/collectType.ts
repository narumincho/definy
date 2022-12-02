import { ApiFunction } from "./apiFunction.ts";
import { lazyGet } from "../../lazy.ts";
import { DefinyRpcType, definyRpcTypeToMapKey, TypeBody } from "./type.ts";
import { namespaceToString } from "../codeGen/namespace.ts";
import {
  DefinyRpcTypeInfo,
  Field,
  Namespace,
  Pattern,
  Type,
  TypeBody as CTypedBody,
} from "./coreType.ts";

export const collectDefinyRpcTypeFromFuncList = (
  funcList: ReadonlyArray<ApiFunction>,
): CollectedDefinyRpcTypeMap => {
  return collectFromDefinyRpcTypeList(
    funcList.flatMap((func) => [func.input, func.output]),
    new Set([]),
  );
};

/**
 * 循環的構造があった場合, 無限ループになるのを防ぐためにすでに見つけた名前を渡す必要がある
 * @param type
 * @param collectedNames すでに見つけた型の名前 `.` 区切り
 */
const collectFromDefinyRpcType = <t>(
  type: DefinyRpcType<t>,
  collectedNames: ReadonlySet<string>,
): CollectedDefinyRpcTypeMap => {
  const typeFullName = definyRpcTypeToMapKey(type);
  if (collectedNames.has(typeFullName)) {
    return collectFromDefinyRpcTypeList(type.parameters, collectedNames);
  }
  const newMap: CollectedDefinyRpcTypeMap = new Map([
    [
      typeFullName,
      DefinyRpcTypeInfo.from({
        namespace: type.namespace,
        name: type.name,
        description: type.description,
        parameterCount: type.parameters.length,
        body: typeBodyToCollectedDefinyRpcTypeBody(type.body),
      }),
    ],
  ]);
  const newCollectedNames = new Set([...collectedNames, typeFullName]);
  if (type.body.type === "product") {
    return new Map([
      ...newMap,
      ...collectFromDefinyRpcTypeList(
        [
          ...type.parameters,
          ...type.body.fieldList.map((filed) => lazyGet(filed.type)),
        ],
        newCollectedNames,
      ),
    ]);
  }
  if (type.body.type === "sum") {
    return new Map([
      ...newMap,
      ...collectFromDefinyRpcTypeList(
        [
          ...type.parameters,
          ...type.body.patternList.flatMap((pattern) =>
            pattern.parameter === undefined ? [] : lazyGet(pattern.parameter)
          ),
        ],
        newCollectedNames,
      ),
    ]);
  }
  return new Map([
    ...newMap,
    ...collectFromDefinyRpcTypeList(type.parameters, newCollectedNames),
  ]);
};

type CollectInListState = {
  readonly collectedNames: ReadonlySet<string>;
  readonly map: CollectedDefinyRpcTypeMap;
};

/**
 * 循環的構造があった場合, 無限ループになるのを防ぐためにすでに見つけた名前を渡す必要がある
 * @param typeList
 * @param collectedNames すでに見つけた型の名前 `.` 区切り
 */
export const collectFromDefinyRpcTypeList = <t>(
  typeList: ReadonlyArray<DefinyRpcType<t>>,
  collectedNames: ReadonlySet<string>,
): CollectedDefinyRpcTypeMap => {
  return typeList.reduce<CollectInListState>(
    (prev, type): CollectInListState => {
      const resultMap = collectFromDefinyRpcType(type, prev.collectedNames);
      return {
        collectedNames: new Set([...prev.collectedNames, ...resultMap.keys()]),
        map: new Map([...prev.map, ...resultMap]),
      };
    },
    { collectedNames, map: new Map() },
  ).map;
};

export type CollectedDefinyRpcTypeMap = ReadonlyMap<
  string,
  DefinyRpcTypeInfo
>;

export type CodeGenContext = {
  readonly map: CollectedDefinyRpcTypeMap;
  readonly currentModule: Namespace;
};

export const collectedDefinyRpcTypeMapGet = (
  map: CollectedDefinyRpcTypeMap,
  namespace: Namespace,
  name: string,
): DefinyRpcTypeInfo | undefined => {
  return map.get(
    namespaceToString(namespace) +
      "." +
      name,
  );
};

const typeBodyToCollectedDefinyRpcTypeBody = (
  typeBody: TypeBody,
): CTypedBody => {
  switch (typeBody.type) {
    case "string":
      return CTypedBody.string;
    case "number":
      return CTypedBody.number;
    case "boolean":
      return CTypedBody.boolean;
    case "unit":
      return CTypedBody.unit;
    case "list":
      return CTypedBody.list;
    case "set":
      return CTypedBody.set;
    case "map":
      return CTypedBody.map;
    case "product":
      return CTypedBody.product(
        typeBody.fieldList.map((field) =>
          Field.from({
            name: field.name,
            description: field.description,
            type: definyRpcTypeToCollectedDefinyRpcTypeUse(lazyGet(field.type)),
          })
        ),
      );
    case "sum":
      return CTypedBody.sum(typeBody.patternList.map((pattern) =>
        Pattern.from({
          name: pattern.name,
          description: pattern.description,
          parameter: pattern.parameter === undefined ? { type: "nothing" } : {
            type: "just",
            value: definyRpcTypeToCollectedDefinyRpcTypeUse(
              lazyGet(pattern.parameter),
            ),
          },
        })
      ));
    case "url":
      return CTypedBody.url;
  }
};

export const definyRpcTypeToCollectedDefinyRpcTypeUse = <t>(
  type: DefinyRpcType<t>,
): Type => {
  return Type.from({
    namespace: type.namespace,
    name: type.name,
    parameters: type.parameters.map(definyRpcTypeToCollectedDefinyRpcTypeUse),
  });
};

import { ApiFunction } from "./apiFunction.ts";
import { lazyGet } from "../../lazy.ts";
import { DefinyRpcType, definyRpcTypeToMapKey, TypeBody } from "./type.ts";
import { NonEmptyArray } from "../../util.ts";

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
      {
        namespace: type.namespace,
        name: type.name,
        description: type.description,
        parameterCount: type.parameters.length,
        body: typeBodyToCollectedDefinyRpcTypeBody(type.body),
      },
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
  CollectedDefinyRpcType
>;

/// 循環的構造があった場合, 見つけられないんじゃないか?
/// 同じ名前が見つかったらストップ (パラメーターは見る)
export type CollectedDefinyRpcType = {
  readonly namespace: NonEmptyArray<string>;
  readonly name: string;
  readonly description: string;
  readonly parameterCount: number;
  readonly body: CollectedDefinyRpcTypeBody;
};

export type CollectedDefinyRpcTypeBody =
  | {
    readonly type: "string";
  }
  | {
    readonly type: "number";
  }
  | { readonly type: "boolean" }
  | {
    readonly type: "unit";
  }
  | {
    readonly type: "list";
  }
  | {
    readonly type: "set";
  }
  | { readonly type: "stringMap"; valueType: CollectedDefinyRpcTypeUse }
  | {
    readonly type: "product";
    readonly fieldList: ReadonlyArray<{
      readonly name: string;
      readonly description: string;
      readonly type: CollectedDefinyRpcTypeUse;
    }>;
  }
  | {
    readonly type: "sum";
    readonly patternList: ReadonlyArray<{
      readonly name: string;
      readonly description: string;
      readonly parameter: CollectedDefinyRpcTypeUse | undefined;
    }>;
  };

const typeBodyToCollectedDefinyRpcTypeBody = (
  typeBody: TypeBody,
): CollectedDefinyRpcTypeBody => {
  switch (typeBody.type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "unit":
      return { type: "unit" };
    case "list":
      return { type: "list" };
    case "set":
      return { type: "set" };
    case "stringMap":
      return {
        type: "stringMap",
        valueType: definyRpcTypeToCollectedDefinyRpcTypeUse(
          lazyGet(typeBody.valueType),
        ),
      };
    case "product":
      return {
        type: "product",
        fieldList: typeBody.fieldList.map((field) => ({
          name: field.name,
          description: field.description,
          type: definyRpcTypeToCollectedDefinyRpcTypeUse(lazyGet(field.type)),
        })),
      };
    case "sum":
      return {
        type: "sum",
        patternList: typeBody.patternList.map((pattern) => ({
          name: pattern.name,
          description: pattern.description,
          parameter: pattern.parameter === undefined
            ? undefined
            : definyRpcTypeToCollectedDefinyRpcTypeUse(
              lazyGet(pattern.parameter),
            ),
        })),
      };
  }
};

const definyRpcTypeToCollectedDefinyRpcTypeUse = <t>(
  type: DefinyRpcType<t>,
): CollectedDefinyRpcTypeUse => {
  return {
    namespace: type.namespace,
    name: type.name,
    parameters: type.parameters.map(definyRpcTypeToCollectedDefinyRpcTypeUse),
  };
};

export type CollectedDefinyRpcTypeUse = {
  readonly namespace: NonEmptyArray<string>;
  readonly name: string;
  readonly parameters: ReadonlyArray<CollectedDefinyRpcTypeUse>;
};

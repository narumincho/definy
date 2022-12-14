import { structuredJsonParse } from "../../typedJson.ts";
import {
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  createTypeKey,
} from "./collectType.ts";
import {
  DefinyRpcTypeInfo,
  Field,
  Pattern,
  StructuredJsonValue,
  Type,
  TypeParameterInfo,
} from "./coreType.ts";

const changeType = <T>(type: Type<unknown>): Type<T> => type as Type<T>;

export const fromStructuredJsonValue = <T>(
  type: Type<T>,
  typeMap: CollectedDefinyRpcTypeMap,
  jsonValue: StructuredJsonValue,
): T => {
  const typeInfo = collectedDefinyRpcTypeMapGet(
    typeMap,
    type.namespace,
    type.name,
  );

  switch (typeInfo.body.type) {
    case "string": {
      if (jsonValue.type !== "string") {
        throw new Error(
          `expected json string in String type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return jsonValue.value as T;
    }
    case "number": {
      if (jsonValue.type !== "number") {
        throw new Error(
          `expected json number in Number type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return jsonValue.value as T;
    }
    case "boolean": {
      if (jsonValue.type !== "boolean") {
        throw new Error(
          `expected json boolean in Bool type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return jsonValue.value as T;
    }
    case "unit": {
      return undefined as T;
    }
    case "list": {
      const [elementType] = type.parameters;
      if (elementType === undefined) {
        throw new Error(
          `expected type parameter in List type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      if (jsonValue.type !== "array") {
        throw new Error(
          `expected json array in List type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return jsonValue.value.map((element) =>
        fromStructuredJsonValueConsiderTypeParameter(
          type.parameters,
          typeInfo.parameter,
          elementType,
          typeMap,
          element,
        )
      ) as T;
    }
    case "set": {
      const [elementType] = type.parameters;
      if (elementType === undefined) {
        throw new Error(
          `expected type parameter in Set type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      if (jsonValue.type !== "array") {
        throw new Error(
          `expected json array in List type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      // パラメータを受け取らないとな...
      return new Set(
        jsonValue.value.map((element) =>
          fromStructuredJsonValueConsiderTypeParameter(
            type.parameters,
            typeInfo.parameter,
            elementType,
            typeMap,
            element,
          )
        ),
      ) as T;
    }
    case "map":
      return toMap(
        changeType<ReadonlyMap<unknown, unknown>>(type),
        typeInfo,
        typeMap,
        jsonValue,
      ) as T;

    case "url": {
      if (jsonValue.type !== "string") {
        throw new Error(
          `expected json string in URL (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return new URL(jsonValue.value) as T;
    }
    case "product":
      return toProduct(
        changeType<Record<string, unknown>>(type),
        typeInfo,
        typeMap,
        jsonValue,
        typeInfo.body.value,
      ) as T;
    case "sum":
      return toSum(
        changeType<
          {
            readonly type: string;
            readonly value?: unknown;
            readonly [Symbol.toStringTag]: string;
          }
        >(type),
        typeInfo,
        typeMap,
        jsonValue,
        typeInfo.body.value,
      ) as T;
  }
};

const toMap = <K, V>(
  type: Type<ReadonlyMap<K, V>>,
  typeInfo: DefinyRpcTypeInfo,
  typeMap: CollectedDefinyRpcTypeMap,
  jsonValue: StructuredJsonValue,
): ReadonlyMap<K, V> => {
  const [keyType, valueType] = type.parameters;
  if (keyType === undefined || valueType === undefined) {
    throw new Error(
      `expected 2 type parameter in Map type (${
        createTypeKey(type.namespace, type.name)
      })`,
    );
  }
  if (jsonValue.type !== "object") {
    throw new Error(
      `expected json object in Map type (${
        createTypeKey(type.namespace, type.name)
      })`,
    );
  }
  return new Map<K, V>(
    [...jsonValue.value].map(
      ([key, valueJson]): readonly [K, V] => {
        const keyTypeInfo = collectedDefinyRpcTypeMapGet(
          typeMap,
          keyType.namespace,
          keyType.name,
        );
        if (keyTypeInfo.body.type === "string") {
          return [
            key as K,
            fromStructuredJsonValueConsiderTypeParameter(
              type.parameters,
              typeInfo.parameter,
              changeType<V>(valueType),
              typeMap,
              valueJson,
            ),
          ];
        }
        const keyJson = structuredJsonParse(key);
        if (keyJson === undefined) {
          throw new Error(
            `Map 型のときに key が string 以外での場合は json として解釈できる文字列である必要があります (${
              createTypeKey(type.namespace, type.name)
            })`,
          );
        }

        return [
          fromStructuredJsonValueConsiderTypeParameter(
            type.parameters,
            typeInfo.parameter,
            changeType<K>(keyType),
            typeMap,
            keyJson,
          ),
          fromStructuredJsonValueConsiderTypeParameter(
            type.parameters,
            typeInfo.parameter,
            changeType<V>(valueType),
            typeMap,
            valueJson,
          ),
        ];
      },
    ),
  );
};

const toProduct = <T extends Record<string, unknown>>(
  type: Type<T>,
  typeInfo: DefinyRpcTypeInfo,
  typeMap: CollectedDefinyRpcTypeMap,
  jsonValue: StructuredJsonValue,
  fields: ReadonlyArray<Field>,
): T => {
  if (jsonValue.type !== "object") {
    throw new Error(
      `expected json object in product (${
        createTypeKey(type.namespace, type.name)
      })`,
    );
  }
  return Object.fromEntries([
    ...fields.map((field): [string, unknown] => {
      const fieldValueJson = jsonValue.value.get(field.name);
      if (fieldValueJson === undefined) {
        throw new Error(
          `${
            createTypeKey(type.namespace, type.name)
          } need ${field.name} field (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return [
        field.name,
        fromStructuredJsonValueConsiderTypeParameter(
          type.parameters,
          typeInfo.parameter,
          changeType(field.type),
          typeMap,
          fieldValueJson,
        ),
      ];
    }),
    [
      Symbol.toStringTag,
      createTypeKey(type.namespace, type.name),
    ],
  ]) as T;
};

const toSum = <
  T extends {
    readonly type: string;
    readonly value?: unknown;
    readonly [Symbol.toStringTag]: string;
  },
>(
  type: Type<T>,
  typeInfo: DefinyRpcTypeInfo,
  typeMap: CollectedDefinyRpcTypeMap,
  jsonValue: StructuredJsonValue,
  patternList: ReadonlyArray<Pattern>,
): {
  readonly type: string;
  readonly value?: unknown;
  readonly [Symbol.toStringTag]: string;
} => {
  if (jsonValue.type === "string") {
    for (const pattern of patternList) {
      if (pattern.name === jsonValue.value) {
        if (pattern.parameter.type === "just") {
          throw new Error(
            `expected json object in sum pattern with parameter (${
              createTypeKey(type.namespace, type.name)
            })`,
          );
        }
        return {
          type: pattern.name,
          [Symbol.toStringTag]: createTypeKey(
            type.namespace,
            type.name,
          ),
        };
      }
    }
    throw new Error(
      `unknown pattern name expected [${
        patternList.map((p) => p.name).join(",")
      }] but got ${jsonValue.value} (${
        createTypeKey(type.namespace, type.name)
      })`,
    );
  }
  if (jsonValue.type === "object") {
    const typeFieldJson = jsonValue.value.get("type");
    if (typeFieldJson?.type !== "string") {
      throw new Error(
        `expected json string in sum pattern key (${
          createTypeKey(type.namespace, type.name)
        })`,
      );
    }
    for (const pattern of patternList) {
      if (pattern.name === typeFieldJson.value) {
        if (pattern.parameter.type === "just") {
          const valueJson = jsonValue.value.get("value");
          if (valueJson === undefined) {
            throw new Error(
              `expected value field in sum pattern with parameter (${
                createTypeKey(type.namespace, type.name)
              })`,
            );
          }
          return {
            type: pattern.name,
            value: fromStructuredJsonValueConsiderTypeParameter(
              type.parameters,
              typeInfo.parameter,
              pattern.parameter.value,
              typeMap,
              valueJson,
            ),
            [Symbol.toStringTag]: createTypeKey(
              type.namespace,
              type.name,
            ),
          } as T;
        }
        return {
          type: pattern.name,
          [Symbol.toStringTag]: createTypeKey(
            type.namespace,
            type.name,
          ),
        } as T;
      }
    }
    throw new Error(
      `unknown pattern name expected [${
        patternList.map((p) => p.name).join(",")
      }] but got ${jsonValue.value} (${
        createTypeKey(type.namespace, type.name)
      })`,
    );
  }
  throw new Error(
    `expected json object or string in sum (${
      createTypeKey(type.namespace, type.name)
    })`,
  );
};

const fromStructuredJsonValueConsiderTypeParameter = <T>(
  typeParameters: ReadonlyArray<Type<unknown>>,
  typeParameterInfoList: ReadonlyArray<TypeParameterInfo>,
  type: Type<T>,
  typeMap: CollectedDefinyRpcTypeMap,
  jsonValue: StructuredJsonValue,
): T => {
  if (typeParameters.length !== typeParameterInfoList.length) {
    throw new Error(
      "型パラメータの数が合わない! expected:" + typeParameterInfoList.length + " but got:" +
        typeParameters.length,
    );
  }
  for (const [index, typeParameter] of typeParameterInfoList.entries()) {
    if (typeParameter.name === type.name) {
      const matchedTypeParameter = typeParameters[index];
      if (matchedTypeParameter === undefined) {
        throw new Error("型パラメータの数が合わない?");
      }
      return fromStructuredJsonValue(
        changeType<T>(matchedTypeParameter),
        typeMap,
        jsonValue,
      );
    }
  }
  return fromStructuredJsonValue(
    type,
    typeMap,
    jsonValue,
  );
};

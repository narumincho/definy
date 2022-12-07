import { structuredJsonParse } from "../../typedJson.ts";
import {
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  createTypeKey,
} from "./collectType.ts";
import { StructuredJsonValue, Type } from "./coreType.ts";

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
        fromStructuredJsonValue(elementType, typeMap, element)
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
          fromStructuredJsonValue(elementType, typeMap, element)
        ),
      ) as T;
    }
    case "map": {
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
      return new Map(
        [...jsonValue.value].map(
          ([key, valueJson]): readonly [unknown, unknown] => {
            const keyTypeInfo = collectedDefinyRpcTypeMapGet(
              typeMap,
              keyType.namespace,
              keyType.name,
            );
            if (keyTypeInfo.body.type === "string") {
              return [
                key,
                fromStructuredJsonValue(valueType, typeMap, valueJson),
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
              fromStructuredJsonValue(
                keyType,
                typeMap,
                keyJson,
              ),
              fromStructuredJsonValue(valueType, typeMap, valueJson),
            ];
          },
        ),
      ) as T;
    }
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
    case "product": {
      if (jsonValue.type !== "object") {
        throw new Error(
          `expected json object in product (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return Object.fromEntries([
        ...typeInfo.body.value.map((field): [string, unknown] => {
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
          return [field.name, fieldValueJson];
        }),
        [
          Symbol.toStringTag,
          createTypeKey(typeInfo.namespace, type.name),
        ],
      ]) as T;
    }
    case "sum": {
      if (jsonValue.type === "string") {
        for (const pattern of typeInfo.body.value) {
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
                typeInfo.namespace,
                typeInfo.name,
              ),
            } as T;
          }
        }
        throw new Error(
          `unknown pattern name expected [${
            typeInfo.body.value.map((p) => p.name).join(",")
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
        for (const pattern of typeInfo.body.value) {
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
                value: fromStructuredJsonValue(
                  pattern.parameter.value,
                  typeMap,
                  valueJson,
                ),
                [Symbol.toStringTag]: createTypeKey(
                  typeInfo.namespace,
                  typeInfo.name,
                ),
              } as T;
            }
            return {
              type: pattern.name,
              [Symbol.toStringTag]: createTypeKey(
                typeInfo.namespace,
                typeInfo.name,
              ),
            } as T;
          }
        }
        throw new Error(
          `unknown pattern name expected [${
            typeInfo.body.value.map((p) => p.name).join(",")
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
    }
  }
};

// TODO
export const toStructuredJsonValue = <t>(
  type: Type<t>,
  typeMap: CollectedDefinyRpcTypeMap,
  value: t,
): StructuredJsonValue => {
  return StructuredJsonValue.null;
};

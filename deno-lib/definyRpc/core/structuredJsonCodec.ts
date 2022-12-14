import {
  structuredJsonParse,
  structuredJsonStringify,
} from "../../typedJson.ts";
import {
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  createTypeKey,
} from "./collectType.ts";
import {
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
    case "map":
      return toMap(
        changeType<ReadonlyMap<unknown, unknown>>(type),
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
        typeMap,
        jsonValue,
        typeInfo.body.value,
      ) as T;
  }
};

const toMap = <K, V>(
  type: Type<ReadonlyMap<K, V>>,
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
            fromStructuredJsonValue<V>(
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
          fromStructuredJsonValue<K>(
            changeType<K>(keyType),
            typeMap,
            keyJson,
          ),
          fromStructuredJsonValue<V>(
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
        fromStructuredJsonValue(
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
            value: fromStructuredJsonValue(
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

export const toStructuredJsonValue = <t>(
  type: Type<t>,
  typeMap: CollectedDefinyRpcTypeMap,
  value: t,
): StructuredJsonValue => {
  const typeInfo = collectedDefinyRpcTypeMapGet(
    typeMap,
    type.namespace,
    type.name,
  );
  switch (typeInfo.body.type) {
    case "string":
      if (typeof value !== "string") {
        throw new Error("expected string in toStructuredJsonValue");
      }
      return StructuredJsonValue.string(value);
    case "number":
      if (typeof value !== "number") {
        throw new Error("expected number in toStructuredJsonValue");
      }
      return StructuredJsonValue.number(value);
    case "boolean":
      if (typeof value !== "boolean") {
        throw new Error("expected boolean in toStructuredJsonValue");
      }
      return StructuredJsonValue.boolean(value);
    case "unit":
      return StructuredJsonValue.null;
    case "list": {
      if (!(value instanceof Array)) {
        throw new Error("expected Array in toStructuredJsonValue");
      }
      const [elementType] = type.parameters;
      if (elementType === undefined) {
        throw new Error(
          `expected type parameter in List type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return StructuredJsonValue.array(
        value.map((element) =>
          toStructuredJsonValueConsiderTypeParameter(
            type.parameters,
            typeInfo.parameter,
            elementType,
            typeMap,
            element,
          )
        ),
      );
    }
    case "set": {
      if (!(value instanceof Set)) {
        throw new Error("expected Set in toStructuredJsonValue");
      }
      const [elementType] = type.parameters;
      if (elementType === undefined) {
        throw new Error(
          `expected type parameter in Set type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      return StructuredJsonValue.array(
        [...value].map((element) =>
          toStructuredJsonValueConsiderTypeParameter(
            type.parameters,
            typeInfo.parameter,
            elementType,
            typeMap,
            element,
          )
        ),
      );
    }
    case "map": {
      if (!(value instanceof Map)) {
        throw new Error("expected Map in toStructuredJsonValue");
      }
      const [keyType, valueType] = type.parameters;
      if (keyType === undefined || valueType === undefined) {
        throw new Error(
          `expected 2 type parameter in Map type (${
            createTypeKey(type.namespace, type.name)
          })`,
        );
      }
      const keyTypeInfo = collectedDefinyRpcTypeMapGet(
        typeMap,
        keyType.namespace,
        keyType.name,
      );
      if (keyTypeInfo.body.type === "string") {
        return StructuredJsonValue.object(
          new Map(
            [...value].map((
              [key, value],
            ): [string, StructuredJsonValue] => [
              key,
              toStructuredJsonValueConsiderTypeParameter(
                type.parameters,
                typeInfo.parameter,
                valueType,
                typeMap,
                value,
              ),
            ]),
          ),
        );
      }

      return StructuredJsonValue.object(
        new Map(
          [...value].map((
            [key, value],
          ): [string, StructuredJsonValue] => [
            structuredJsonStringify(
              toStructuredJsonValueConsiderTypeParameter(
                type.parameters,
                typeInfo.parameter,
                keyType,
                typeMap,
                key,
              ),
            ),
            toStructuredJsonValueConsiderTypeParameter(
              type.parameters,
              typeInfo.parameter,
              valueType,
              typeMap,
              value,
            ),
          ]),
        ),
      );
    }
    case "url": {
      if (!(value instanceof URL)) {
        throw new Error("expected Map in toStructuredJsonValue");
      }
      return StructuredJsonValue.string(value.toString());
    }
    case "product": {
      return StructuredJsonValue.object(
        new Map(
          typeInfo.body.value.map((
            field,
          ): readonly [string, StructuredJsonValue] => [
            field.name,
            toStructuredJsonValueConsiderTypeParameter(
              type.parameters,
              typeInfo.parameter,
              field.type,
              typeMap,
              (value as Record<string, unknown>)[field.name],
            ),
          ]),
        ),
      );
    }
    case "sum": {
      const valueObj = value as {
        readonly type: string;
        readonly value?: unknown;
      };
      if (
        typeInfo.body.value.every((pattern) =>
          pattern.parameter.type === "nothing"
        )
      ) {
        return StructuredJsonValue.string(valueObj.type);
      }
      for (const pattern of typeInfo.body.value) {
        if (pattern.name === valueObj.type) {
          if (pattern.parameter.type === "just") {
            return StructuredJsonValue.object(
              new Map([
                ["type", StructuredJsonValue.string(pattern.name)],
                [
                  "value",
                  toStructuredJsonValueConsiderTypeParameter(
                    type.parameters,
                    typeInfo.parameter,
                    pattern.parameter.value,
                    typeMap,
                    valueObj.value,
                  ),
                ],
              ]),
            );
          }
          return StructuredJsonValue.object(
            new Map([
              ["type", StructuredJsonValue.string(pattern.name)],
            ]),
          );
        }
      }
      throw new Error(
        `unknown pattern name expected [${
          typeInfo.body.value.map((p) => p.name).join(",")
        }] but got ${valueObj.type} (${
          createTypeKey(type.namespace, type.name)
        })`,
      );
    }
  }
};

export const toStructuredJsonValueConsiderTypeParameter = <t>(
  typeParameters: ReadonlyArray<Type<unknown>>,
  typeParameterInfoList: ReadonlyArray<TypeParameterInfo>,
  type: Type<t>,
  typeMap: CollectedDefinyRpcTypeMap,
  value: t,
): StructuredJsonValue => {
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
      return toStructuredJsonValue(
        matchedTypeParameter,
        typeMap,
        value,
      );
    }
  }
  return toStructuredJsonValue(
    type,
    typeMap,
    value,
  );
};

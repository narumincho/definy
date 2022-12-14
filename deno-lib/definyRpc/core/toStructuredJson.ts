import { structuredJsonStringify } from "../../typedJson.ts";
import {
  CollectedDefinyRpcTypeMap,
  collectedDefinyRpcTypeMapGet,
  createTypeKey,
} from "./collectType.ts";
import { StructuredJsonValue, Type, TypeParameterInfo } from "./coreType.ts";

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

const toStructuredJsonValueConsiderTypeParameter = <t>(
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

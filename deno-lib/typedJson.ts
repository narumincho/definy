import { StructuredJsonValue } from "./definyRpc/core/coreType.ts";

export type RawJsonValue =
  | null
  | string
  | number
  | boolean
  | {
    readonly [K in string]: RawJsonValue;
  }
  | ReadonlyArray<RawJsonValue>;

export const jsonParse = (value: string): RawJsonValue | undefined => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("json のパースエラー", e);
    return undefined;
  }
};

export const structuredJsonParse = (
  value: string,
): StructuredJsonValue | undefined => {
  const rawJson = jsonParse(value);
  if (rawJson === undefined) {
    return undefined;
  }
  return rawJsonToStructuredJsonValue(rawJson);
};

export const rawJsonToStructuredJsonValue = (
  rawJson: RawJsonValue,
): StructuredJsonValue => {
  if (rawJson === null) {
    return StructuredJsonValue.null;
  }
  if (typeof rawJson === "boolean") {
    return StructuredJsonValue.boolean(rawJson);
  }
  if (typeof rawJson === "string") {
    return StructuredJsonValue.string(rawJson);
  }
  if (typeof rawJson === "number") {
    return StructuredJsonValue.number(rawJson);
  }
  if (rawJson instanceof Array) {
    return StructuredJsonValue.array(rawJson.map(rawJsonToStructuredJsonValue));
  }
  return StructuredJsonValue.object(
    new Map(
      Object.entries(rawJson).map(([k, v]) => [
        k,
        rawJsonToStructuredJsonValue(v),
      ]),
    ),
  );
};

export const jsonStringify = (
  jsonValue: RawJsonValue,
  indent = false,
): string => {
  if (indent) {
    return JSON.stringify(jsonValue, undefined, 2);
  }
  return JSON.stringify(jsonValue);
};

export const structuredJsonStringify = (
  structuredJsonValue: StructuredJsonValue,
  indent = false,
): string => {
  return jsonStringify(
    structuredJsonValueToRawJson(structuredJsonValue),
    indent,
  );
};

export const structuredJsonValueToRawJson = (
  structuredJsonValue: StructuredJsonValue,
): RawJsonValue => {
  switch (structuredJsonValue.type) {
    case "null":
      return null;
    case "string":
      return structuredJsonValue.value;
    case "number":
      return structuredJsonValue.value;
    case "boolean":
      return structuredJsonValue.value;
    case "array":
      return structuredJsonValue.value.map(structuredJsonValueToRawJson);
    case "object":
      return Object.fromEntries(
        [...structuredJsonValue.value.entries()].map(
          ([k, v]) => [k, structuredJsonValueToRawJson(v)],
        ),
      );
  }
};

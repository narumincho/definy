
export type JsonValue =
  | null
  | string
  | number
  | boolean
  | {
      readonly [K in string]?: JsonValue;
    }
  | ReadonlyArray<JsonValue>;

export const jsonParse = (value: string): JsonValue | undefined => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("json のパースエラー", e);
    return undefined;
  }
};

export const jsonStringify = (jsonValue: JsonValue): string => {
  return JSON.stringify(jsonValue);
};

export type JsonValue =
  | null
  | string
  | number
  | boolean
  | {
      readonly [K in string]?: JsonValue;
    }
  | ReadonlyArray<JsonValue>;

export const jsonParse = (value: string): JsonValue => {
  return JSON.parse(value);
};

export const jsonStringify = (jsonValue: JsonValue): string => {
  return JSON.stringify(jsonValue);
};

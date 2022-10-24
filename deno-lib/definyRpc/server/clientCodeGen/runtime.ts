import { identifierFromString, data } from "../../../jsTs/main.ts";

const runtimeModuleName = "./runtime";

export const structuredJsonValueType: data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: runtimeModuleName,
    nameAndArguments: {
      name: identifierFromString("StructuredJsonValue"),
      arguments: [],
    },
  },
};

export const rawJsonValueType: data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: runtimeModuleName,
    nameAndArguments: {
      name: identifierFromString("RawJsonValue"),
      arguments: [],
    },
  },
};

export const useRawJsonToStructuredJsonValue = (
  rawJsonExpr: data.TsExpr
): data.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: {
      _: "ImportedVariable",
      importedVariable: {
        moduleName: runtimeModuleName,
        name: identifierFromString("rawJsonToStructuredJsonValue"),
      },
    },
    parameterList: [rawJsonExpr],
  },
});

export const runtimeCode = `export type RawJsonValue =
  | null
  | string
  | number
  | boolean
  | {
      readonly [K in string]: RawJsonValue;
    }
  | ReadonlyArray<RawJsonValue>;

export type StructuredJsonValue =
  | { readonly type: "null" }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | {
      readonly type: "object";
      readonly value: ReadonlyMap<string, StructuredJsonValue>;
    }
  | {
      readonly type: "array";
      readonly value: ReadonlyArray<StructuredJsonValue>;
    };

export const jsonParse = (value: string): RawJsonValue | undefined => {
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("json のパースエラー", e);
    return undefined;
  }
};

export const structuredJsonParse = (
  value: string
): StructuredJsonValue | undefined => {
  const rawJson = jsonParse(value);
  if (rawJson === undefined) {
    return undefined;
  }
  return rawJsonToStructuredJsonValue(rawJson);
};

export const rawJsonToStructuredJsonValue = (
  rawJson: RawJsonValue
): StructuredJsonValue => {
  if (rawJson === null) {
    return { type: "null" };
  }
  if (typeof rawJson === "boolean") {
    return { type: "boolean", value: rawJson };
  }
  if (typeof rawJson === "string") {
    return { type: "string", value: rawJson };
  }
  if (typeof rawJson === "number") {
    return { type: "number", value: rawJson };
  }
  if (rawJson instanceof Array) {
    return { type: "array", value: rawJson.map(rawJsonToStructuredJsonValue) };
  }
  return {
    type: "object",
    value: new Map(
      Object.entries(rawJson).map(([k, v]) => [
        k,
        rawJsonToStructuredJsonValue(v),
      ])
    ),
  };
};

export const jsonStringify = (jsonValue: RawJsonValue): string => {
  return JSON.stringify(jsonValue);
};
`;

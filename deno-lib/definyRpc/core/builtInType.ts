import { StructuredJsonValue } from "../../typedJson.ts";
import { Lazy, lazyGet } from "../../lazy.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { NonEmptyArray } from "../../util.ts";
import { DefinyRpcType } from "./type.ts";
import { definyRpcNamespace } from "./definyRpcNamespace.ts";

export const string: DefinyRpcType<string> = {
  namespace: [definyRpcNamespace],
  name: "String",
  description: "文字列",
  parameters: [],
  body: {
    type: "string",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "string") {
      return { type: "string", value };
    }
    throw new Error("expect string in string toJson");
  },
  fromStructuredJsonValue: (json) => {
    if (json.type === "string") {
      return json.value;
    }
    console.error(json);
    throw new Error("expect json string in string fromJson");
  },
};

export const bool: DefinyRpcType<boolean> = {
  namespace: [definyRpcNamespace],
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameters: [],
  body: {
    type: "boolean",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "boolean") {
      return { type: "boolean", value };
    }
    throw new Error("expect boolean in boolean toJson");
  },
  fromStructuredJsonValue: (json) => {
    if (json.type === "boolean") {
      return json.value;
    }
    console.error(json);
    throw new Error("expect json boolean in boolean fromJson");
  },
};

/**
 * struct, record
 */
export const product = <t extends Record<string, unknown>>(parameter: {
  readonly namespace: NonEmptyArray<string>;
  readonly name: string;
  readonly description: string;
  readonly fieldList: {
    [key in keyof t & string]: {
      readonly description: string;
      readonly type: Lazy<DefinyRpcType<t[key]>>;
    };
  };
}): DefinyRpcType<t> => {
  return {
    namespace: parameter.namespace,
    name: parameter.name,
    description: parameter.description,
    parameters: [],
    body: {
      type: "product",
      fieldList: objectEntriesSameValue(parameter.fieldList).map(
        ([name, { description, type }]) => ({
          name: name,
          description: description,
          type: type,
        }),
      ),
    },
    toStructuredJsonValue: (value) => {
      if (typeof value !== "object" || value === null) {
        throw new Error("product object need object");
      }
      const valueObj: { [k in string]?: unknown } = value;
      return {
        type: "object",
        value: new Map(
          objectEntriesSameValue(parameter.fieldList).map((
            [name, { type }],
          ) => [
            name,
            lazyGet(type).toStructuredJsonValue(valueObj[name]),
          ]),
        ),
      };
    },
    fromStructuredJsonValue: (value) => {
      if (value.type !== "object") {
        throw new Error("product object need object");
      }

      return Object.fromEntries(
        objectEntriesSameValue(parameter.fieldList).map(
          ([name, { type }]) => {
            const fieldValue = value.value.get(name);
            if (fieldValue === undefined) {
              throw new Error(
                `${
                  parameter.namespace.join(".")
                }.${parameter.name} need ${name} field`,
              );
            }
            return [name, lazyGet(type).fromStructuredJsonValue(fieldValue)];
          },
        ),
      ) as t;
    },
  };
};

/**
 * taggedUnion, enum with parameter
 */
export const sum = <
  t extends { readonly type: string; readonly value?: unknown },
>(parameter: {
  readonly namespace: NonEmptyArray<string>;
  readonly name: string;
  readonly description: string;
  readonly patternList: {
    [key in t["type"]]: {
      readonly description: string;
      // deno-lint-ignore no-explicit-any
      readonly parameter: Lazy<DefinyRpcType<any>> | undefined;
    };
  };
}): DefinyRpcType<t> => ({
  namespace: parameter.namespace,
  name: parameter.name,
  description: parameter.description,
  parameters: [],
  body: {
    type: "sum",
    patternList: objectEntriesSameValue(parameter.patternList).map(
      ([name, { description, parameter }]) => ({
        name,
        description,
        parameter,
      }),
    ),
  },
  toStructuredJsonValue: (value): StructuredJsonValue => {
    if (typeof value !== "object" || value === null) {
      throw new Error("sum object need object");
    }
    const valueObj: { readonly type?: unknown; readonly value?: unknown } =
      value;
    if ("type" in valueObj) {
      if (typeof valueObj.type !== "string") {
        throw new Error("sum value's type field need string");
      }
      for (
        const [name, pattern] of objectEntriesSameValue(
          parameter.patternList,
        )
      ) {
        if (name === valueObj.type) {
          if (pattern.parameter == undefined) {
            return {
              type: "object",
              value: new Map([["type", { type: "string", value: name }]]),
            };
          }
          return {
            type: "object",
            value: new Map([["type", { type: "string", value: name }], [
              "value",
              lazyGet(pattern.parameter).toStructuredJsonValue(
                valueObj.value,
              ),
            ]]),
          };
        }
      }
      throw new Error("unknown sum type name");
    }
    console.error(value);
    throw new Error("sum object need type field");
  },
  fromStructuredJsonValue: (structuredJsonValue) => {
    if (structuredJsonValue.type !== "object") {
      throw new Error("sum object need object");
    }
    const type = structuredJsonValue.value.get("type");
    if (type === undefined) {
      throw new Error("sum object need type field");
    }
    if (type.type !== "string") {
      throw new Error("sum value's type field need string");
    }
    const value = structuredJsonValue.value.get("value");

    for (
      const [name, pattern] of objectEntriesSameValue(
        parameter.patternList,
      )
    ) {
      if (name === type.value) {
        if (pattern.parameter == undefined) {
          return { type: name } as t;
        }
        if (value === undefined) {
          throw new Error("unknown sum type value");
        }
        return {
          type: name,
          value: lazyGet(pattern.parameter).fromStructuredJsonValue(
            value,
          ),
        } as t;
      }
    }
    throw new Error("unknown sum type name");
  },
});

export const number: DefinyRpcType<number> = {
  namespace: [definyRpcNamespace],
  name: "Number",
  description: "64bit 浮動小数点数",
  parameters: [],
  body: {
    type: "number",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "number") {
      return { type: "number", value };
    }
    throw new Error("number need number");
  },
  fromStructuredJsonValue: (value) => {
    if (value.type === "number") {
      return value.value;
    }
    throw new Error("number need number");
  },
};

export const unit: DefinyRpcType<undefined> = {
  namespace: [definyRpcNamespace],
  name: "Unit",
  description: "内部表現は, undefined. JSON 上では null",
  parameters: [],
  body: { type: "unit" },
  toStructuredJsonValue: () => ({ type: "null" }),
  fromStructuredJsonValue: () => undefined,
};

export const set = <element>(
  element: DefinyRpcType<element>,
): DefinyRpcType<ReadonlySet<element>> => ({
  namespace: [definyRpcNamespace],
  name: "Set",
  description: "集合. Set",
  parameters: [element],
  body: { type: "set" },
  toStructuredJsonValue: (value) => {
    if (value instanceof Set) {
      return {
        type: "array",
        value: [...value].map((e) => lazyGet(element).toStructuredJsonValue(e)),
      };
    }
    throw new Error("set need Set");
  },
  fromStructuredJsonValue: (value) => {
    if (value.type === "array") {
      return new Set(
        value.value.map((e) => lazyGet(element).fromStructuredJsonValue(e)),
      );
    }
    throw new Error("set need json Array");
  },
});

export const list = <element>(
  element: DefinyRpcType<element>,
): DefinyRpcType<ReadonlyArray<element>> => ({
  namespace: [definyRpcNamespace],
  name: "List",
  description: "リスト",
  parameters: [element],
  body: { type: "list" },
  toStructuredJsonValue: (value) => {
    if (value instanceof Array) {
      return {
        type: "array",
        value: value.map((e) => lazyGet(element).toStructuredJsonValue(e)),
      };
    }
    throw new Error("Array need Array");
  },
  fromStructuredJsonValue: (value) => {
    if (value.type === "array") {
      return value.value.map((e) =>
        lazyGet(element).fromStructuredJsonValue(e)
      );
    }
    throw new Error("Array need json Array");
  },
});

export const stringMap = <element>(
  element: DefinyRpcType<element>,
): DefinyRpcType<ReadonlyMap<string, element>> => ({
  namespace: [definyRpcNamespace],
  name: "StringMap",
  description: "キーが string の ReadonlyMap",
  parameters: [element],
  body: { type: "stringMap", valueType: element },
  toStructuredJsonValue: (value) => {
    if (value instanceof Map) {
      return {
        type: "object",
        value: new Map(
          [...value.entries()].map((
            [k, v],
          ) => [k, lazyGet(element).toStructuredJsonValue(v)]),
        ),
      };
    }
    throw new Error("stingMap need Map");
  },
  fromStructuredJsonValue: (value) => {
    if (value.type === "object") {
      return new Map(
        [...value.value].map((
          [k, v],
        ) => [k, lazyGet(element).fromStructuredJsonValue(v)]),
      );
    }
    throw new Error("stingMap need json Object");
  },
});

export const structuredJsonValue: DefinyRpcType<StructuredJsonValue> = sum({
  namespace: [definyRpcNamespace],
  name: "StructuredJsonValue",
  description: "構造化されたJSON",
  patternList: {
    string: {
      description: "string",
      parameter: string,
    },
    array: {
      description: "array",
      parameter: () => list(structuredJsonValue),
    },
    boolean: {
      description: "boolean",
      parameter: bool,
    },
    null: {
      description: "null",
      parameter: unit,
    },
    number: {
      description: "number",
      parameter: number,
    },
    object: {
      description: "object",
      parameter: () => stringMap(structuredJsonValue),
    },
  },
});
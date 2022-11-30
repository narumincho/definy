import { Lazy, lazyGet } from "../../lazy.ts";
import { objectEntriesSameValue } from "../../objectEntriesSameValue.ts";
import { DefinyRpcType } from "./type.ts";
import { StructuredJsonValue } from "./coreType.ts";
import { namespaceToString } from "../codeGen/namespace.ts";

export const string: DefinyRpcType<string> = {
  namespace: { type: "coreType" },
  name: "String",
  description: "文字列",
  parameters: [],
  body: {
    type: "string",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "string") {
      return StructuredJsonValue.string(value);
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
  namespace: { type: "coreType" },
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameters: [],
  body: {
    type: "boolean",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "boolean") {
      return StructuredJsonValue.boolean(value);
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
  readonly namespace: {
    readonly type: "local";
    readonly path: ReadonlyArray<string>;
  } | {
    readonly type: "meta";
  };
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
      return StructuredJsonValue.object(
        new Map(
          objectEntriesSameValue(parameter.fieldList).map((
            [name, { type }],
          ) => [
            name,
            lazyGet(type).toStructuredJsonValue(valueObj[name]),
          ]),
        ),
      );
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
                  namespaceToString(parameter.namespace)
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
  readonly namespace: {
    readonly type: "local";
    readonly path: ReadonlyArray<string>;
  } | {
    readonly type: "meta";
  };
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
            return StructuredJsonValue.object(
              new Map([["type", StructuredJsonValue.string(name)]]),
            );
          }
          return StructuredJsonValue.object(
            new Map([["type", StructuredJsonValue.string(name)], [
              "value",
              lazyGet(pattern.parameter).toStructuredJsonValue(
                valueObj.value,
              ),
            ]]),
          );
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
  namespace: { type: "coreType" },
  name: "Number",
  description: "64bit 浮動小数点数",
  parameters: [],
  body: {
    type: "number",
  },
  toStructuredJsonValue: (value) => {
    if (typeof value === "number") {
      return StructuredJsonValue.number(value);
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
  namespace: { type: "coreType" },
  name: "Unit",
  description: "内部表現は, undefined. JSON 上では null",
  parameters: [],
  body: { type: "unit" },
  toStructuredJsonValue: () => StructuredJsonValue.null,
  fromStructuredJsonValue: () => undefined,
};

export const set = <element>(
  element: DefinyRpcType<element>,
): DefinyRpcType<ReadonlySet<element>> => ({
  namespace: { type: "coreType" },
  name: "Set",
  description: "集合. Set",
  parameters: [element],
  body: { type: "set" },
  toStructuredJsonValue: (value) => {
    if (value instanceof Set) {
      return StructuredJsonValue.array(
        [...value].map((e) => lazyGet(element).toStructuredJsonValue(e)),
      );
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
  namespace: { type: "coreType" },
  name: "List",
  description: "リスト",
  parameters: [element],
  body: { type: "list" },
  toStructuredJsonValue: (value) => {
    if (value instanceof Array) {
      return StructuredJsonValue.array(
        value.map((e) => lazyGet(element).toStructuredJsonValue(e)),
      );
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

export const url: DefinyRpcType<URL> = {
  namespace: { type: "coreType" },
  name: "Url",
  description: "URL",
  parameters: [],
  body: {
    type: "url",
  },
  toStructuredJsonValue: (value) => {
    if (value instanceof URL) {
      return StructuredJsonValue.string(value.toString());
    }
    throw new Error("expect string in string toJson");
  },
  fromStructuredJsonValue: (json) => {
    if (json.type === "string") {
      return new URL(json.value);
    }
    console.error(json);
    throw new Error("expect json string in url fromJson");
  },
};

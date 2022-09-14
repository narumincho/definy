import { JsonValue } from "./typedJson.ts";
import { Lazy, lazyGet } from "./lazy.ts";
import { objectEntriesSameValue } from "./objectEntriesSameValue.ts";

export type DefinyRpcType<in out t> = {
  readonly fullName: readonly [string, ...ReadonlyArray<string>];
  readonly description: string;
  readonly body: TypeBody;
  readonly toJson: (x: unknown) => JsonValue;
  readonly fromJson: (x: JsonValue) => t;
};

export type TypeBody =
  | {
      readonly type: "string";
    }
  | {
      readonly type: "number";
    }
  | {
      readonly type: "unit";
    }
  | {
      readonly type: "list";
      readonly elementType: Lazy<DefinyRpcType<any>>;
    }
  | {
      readonly type: "set";
      readonly elementType: Lazy<DefinyRpcType<any>>;
    }
  | {
      readonly type: "product";
      readonly fieldList: ReadonlyArray<{
        readonly name: string;
        readonly description: string;
        readonly type: Lazy<DefinyRpcType<any>>;
      }>;
    }
  | {
      readonly type: "sum";
      readonly patternList: ReadonlyArray<{
        readonly name: string;
        readonly description: string;
        readonly parameter: Lazy<DefinyRpcType<any>> | undefined;
      }>;
    };

export const string: DefinyRpcType<string> = {
  fullName: ["definyRpc", "String"],
  description: "文字列",
  body: {
    type: "string",
  },
  fromJson: (json) => {
    if (typeof json === "string") {
      return json;
    }
    console.error(json);
    throw new Error("expect json string in string fromJson");
  },
  toJson: (value) => {
    if (typeof value === "string") {
      return value;
    }
    throw new Error("expect string in string toJson");
  },
};

/**
 * struct, record
 */
export const product = <t extends Record<string, unknown>>(parameter: {
  readonly fullName: readonly [string, ...ReadonlyArray<string>];
  readonly description: string;
  readonly fieldList: {
    [key in keyof t & string]: {
      readonly description: string;
      readonly type: Lazy<DefinyRpcType<t[key]>>;
    };
  };
}): DefinyRpcType<t> => {
  return {
    fullName: parameter.fullName,
    description: parameter.description,
    body: {
      type: "product",
      fieldList: objectEntriesSameValue(parameter.fieldList).map(
        ([name, { description, type }]) => ({
          name: name,
          description: description,
          type: type,
        })
      ),
    },
    toJson: (value) => {
      if (typeof value !== "object" || value === null) {
        throw new Error("product object need object");
      }
      const valueObj: { [k in string]?: unknown } = value;
      return Object.fromEntries(
        objectEntriesSameValue(parameter.fieldList).map(([name, { type }]) => [
          name,
          lazyGet(type).toJson(valueObj[name]),
        ])
      );
    },
    fromJson: (value) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !(value instanceof Array)
      ) {
        return Object.fromEntries(
          objectEntriesSameValue(parameter.fieldList).map(
            ([name, { type }]) => {
              const fieldValue = value[name];
              if (fieldValue === undefined) {
                throw new Error(`${parameter.fullName} need ${name} field`);
              }
              return [name, lazyGet(type).fromJson(fieldValue)];
            }
          )
        ) as t;
      }
      throw new Error("product object need object");
    },
  };
};

/**
 * taggedUnion, enum with parameter
 */
export const sum = <
  t extends { readonly type: string; readonly value?: unknown }
>(parameter: {
  readonly fullName: readonly [string, ...ReadonlyArray<string>];
  readonly description: string;
  readonly patternList: {
    [key in t["type"]]: {
      readonly description: string;
      readonly parameter: Lazy<DefinyRpcType<any>> | undefined;
    };
  };
}): DefinyRpcType<t> => ({
  fullName: parameter.fullName,
  description: parameter.description,
  body: {
    type: "sum",
    patternList: objectEntriesSameValue(parameter.patternList).map(
      ([name, { description, parameter }]) => ({
        name,
        description,
        parameter,
      })
    ),
  },
  toJson: (value) => {
    if (typeof value !== "object" || value === null) {
      throw new Error("sum object need object");
    }
    const valueObj: { readonly type?: unknown; readonly value?: unknown } =
      value;
    if ("type" in valueObj) {
      if (typeof valueObj.type !== "string") {
        throw new Error("sum value's type field need string");
      }
      for (const [name, pattern] of objectEntriesSameValue(
        parameter.patternList
      )) {
        if (name === valueObj.type) {
          if (pattern.parameter == undefined) {
            return { type: name };
          }
          return {
            type: name,
            value: lazyGet(pattern.parameter).toJson(valueObj.value),
          };
        }
      }
      throw new Error("unknown sum type name");
    }
    console.error(value);
    throw new Error("sum object need type field");
  },
  fromJson: (value) => {
    if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Array)
    ) {
      const valueObj: {
        readonly type?: JsonValue;
        readonly value?: JsonValue;
      } = value;
      if ("type" in valueObj) {
        if (typeof valueObj.type !== "string") {
          throw new Error("sum value's type field need string");
        }
        for (const [name, pattern] of objectEntriesSameValue(
          parameter.patternList
        )) {
          if (name === valueObj.type) {
            if (pattern.parameter == undefined) {
              return { type: name } as t;
            }
            if (valueObj.value === undefined) {
              throw new Error("unknown sum type value");
            }
            return {
              type: name,
              value: lazyGet(pattern.parameter).fromJson(valueObj.value),
            } as t;
          }
        }
        throw new Error("unknown sum type name");
      }
      throw new Error("sum object need type field");
    }
    throw new Error("sum object need object");
  },
});

export const number: DefinyRpcType<number> = {
  fullName: ["definyRpc", "Number"],
  description: "64bit 浮動小数点数",
  body: {
    type: "number",
  },
  toJson: (value) => {
    if (typeof value === "number") {
      return value;
    }
    throw new Error("number need number");
  },
  fromJson: (value) => {
    if (typeof value === "number") {
      return value;
    }
    throw new Error("number need number");
  },
};

export const unit: DefinyRpcType<undefined> = {
  fullName: ["definyRpc", "Unit"],
  description: "内部表現は, undefined. JSON 上では null",
  body: { type: "unit" },
  toJson: () => null,
  fromJson: () => undefined,
};

export const set = <element>(
  element: Lazy<DefinyRpcType<element>>
): DefinyRpcType<ReadonlySet<element>> => ({
  fullName: ["definyRpc", "Set"],
  description: "集合. Set",
  body: { type: "set", elementType: element },
  toJson: (value) => {
    if (value instanceof Set) {
      return [...value].map((e) => lazyGet(element).toJson(e));
    }
    throw new Error("set need Set");
  },
  fromJson: (value) => {
    if (value instanceof Array) {
      return new Set(value.map((e) => lazyGet(element).fromJson(e)));
    }
    throw new Error("set need json Array");
  },
});

export const list = <element>(
  element: Lazy<DefinyRpcType<element>>
): DefinyRpcType<ReadonlyArray<element>> => ({
  fullName: ["definyRpc"],
  description: "リスト",
  body: { type: "list", elementType: element },
  toJson: (value) => {
    if (value instanceof Array) {
      return value.map((e) => lazyGet(element).toJson(e));
    }
    throw new Error("Array need Array");
  },
  fromJson: (value) => {
    if (value instanceof Array) {
      return value.map((e) => lazyGet(element).fromJson(e));
    }
    throw new Error("Array need json Array");
  },
});

export type DefinyRpcType<t> =
  | (t extends string ? { readonly type: "string" } : never)
  | (t extends number ? { readonly type: "number" } : never)
  | (t extends undefined ? { readonly type: "unit" } : never)
  | (t extends ReadonlyArray<infer e>
      ? {
          readonly type: "list";
          readonly element: DefinyRpcType<e>;
        }
      : never)
  | (t extends ReadonlySet<infer e>
      ? {
          readonly type: "set";
          readonly element: DefinyRpcType<e>;
        }
      : never)
  | {
      readonly type: "sum";
      readonly fullName: ReadonlyArray<string>;
      readonly description: string;
      readonly patterns: {
        [key in string]: {
          readonly description: string;
          readonly type: DefinyRpcType<unknown> | undefined;
        };
      };
    }
  | (t extends Record<string, unknown>
      ? {
          readonly type: "product";
          readonly fullName: ReadonlyArray<string>;
          readonly description: string;
          readonly fields: {
            [key in keyof t]: {
              readonly description: string;
              readonly type: DefinyRpcType<t[key]>;
            };
          };
        }
      : never);

export const string: DefinyRpcType<string> = { type: "string" };

export const number: DefinyRpcType<number> = { type: "number" };

export const unit: DefinyRpcType<undefined> = {
  type: "unit",
};

export const set = <element>(
  element: DefinyRpcType<element>
): DefinyRpcType<ReadonlySet<element>> => ({ type: "set", element });

export const list = <element>(
  element: DefinyRpcType<element>
): DefinyRpcType<ReadonlyArray<element>> => ({ type: "list", element });

export const product = <objectType extends Record<string, unknown>>(parameter: {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly fields: {
    readonly [key in keyof objectType]: {
      readonly description: string;
      readonly type: DefinyRpcType<objectType[key]>;
    };
  };
}): DefinyRpcType<objectType> => {
  const fields = Object.fromEntries(
    Object.entries<{
      readonly description: string;
      readonly type: any;
    }>(parameter.fields).map(([k, v]) => [
      k,
      { description: v.description, type: v.type },
    ])
  ) as {
    [key in keyof objectType]: {
      readonly description: string;
      readonly type: DefinyRpcType<objectType[key]>;
    };
  };

  return {
    type: "product",
    fullName: parameter.fullName,
    description: parameter.description,
    fields,
  } as DefinyRpcType<objectType>;
};

export const sum = <T extends { [key in string]: unknown }>(parameter: {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly patterns: {
    readonly [key in keyof T]: {
      readonly description: string;
      readonly type: DefinyRpcType<T[key]> | undefined;
    };
  };
}): DefinyRpcType<
  ValueOf<{
    [key in keyof T]: T[key] extends undefined
      ? { readonly type: key }
      : { readonly type: key; readonly value: T[key] };
  }>
> => {
  return {
    type: "sum",
    fullName: parameter.fullName,
    description: parameter.description,
    patterns: parameter.patterns,
  } as unknown as DefinyRpcType<
    ValueOf<{
      [key in keyof T]: T[key] extends undefined
        ? { readonly type: key }
        : { readonly type: key; readonly value: T[key] };
    }>
  >;
};

type ValueOf<T> = T[keyof T];

/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/61351534fba3e0549319fe11feee7c3dc823d7c1/deno-lib/typedJson.ts";

/**
 * 構造化されたJSON
 */
export type StructuredJsonValue =
  | {
      /**
       * string
       */
      readonly type: "string";
      /**
       * string
       */
      readonly value: string;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    }
  | {
      /**
       * array
       */
      readonly type: "array";
      /**
       * array
       */
      readonly value: globalThis.ReadonlyArray<StructuredJsonValue>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    }
  | {
      /**
       * boolean
       */
      readonly type: "boolean";
      /**
       * boolean
       */
      readonly value: boolean;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    }
  | {
      /**
       * null
       */
      readonly type: "null";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    }
  | {
      /**
       * number
       */
      readonly type: "number";
      /**
       * number
       */
      readonly value: number;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    }
  | {
      /**
       * object
       */
      readonly type: "object";
      /**
       * object
       */
      readonly value: StringMap<StructuredJsonValue>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    };

/**
 * キーが string の ReadonlyMap
 */
export type StringMap<p0 extends unknown> = globalThis.ReadonlyMap<
  string,
  unknown
>;

/**
 * 文字列
 */
export const String: {
  /**
   * String の説明文
   */
  readonly description: string;
  /**
   * JsonからStringに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: a.StructuredJsonValue) => string;
} = {
  description: "文字列",
  fromStructuredJsonValue: (jsonValue: a.StructuredJsonValue): string => {
    if (jsonValue.type === "string") {
      return jsonValue.value;
    }
    throw new Error("expected string in String.fromStructuredJsonValue");
  },
};

/**
 * Bool. boolean. 真偽値. True か False
 */
export const Bool: {
  /**
   * Bool の説明文
   */
  readonly description: string;
  /**
   * JsonからBoolに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: a.StructuredJsonValue) => boolean;
} = {
  description: "Bool. boolean. 真偽値. True か False",
  fromStructuredJsonValue: (jsonValue: a.StructuredJsonValue): boolean => {
    if (jsonValue.type === "boolean") {
      return jsonValue.value;
    }
    throw new Error("expected boolean in Bool.fromStructuredJsonValue");
  },
};

/**
 * 64bit 浮動小数点数
 */
export const Number: {
  /**
   * Number の説明文
   */
  readonly description: string;
  /**
   * JsonからNumberに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: a.StructuredJsonValue) => number;
} = {
  description: "64bit 浮動小数点数",
  fromStructuredJsonValue: (jsonValue: a.StructuredJsonValue): number => {
    if (jsonValue.type === "number") {
      return jsonValue.value;
    }
    throw new Error("expected number in Number.fromStructuredJsonValue");
  },
};

/**
 * 構造化されたJSON
 */
export const StructuredJsonValue: {
  /**
   * StructuredJsonValue の説明文
   */
  readonly description: string;
  /**
   * JsonからStructuredJsonValueに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (
    a: a.StructuredJsonValue
  ) => StructuredJsonValue;
  /**
   * string
   */
  readonly string: (a: string) => StructuredJsonValue;
  /**
   * array
   */
  readonly array: (
    a: globalThis.ReadonlyArray<StructuredJsonValue>
  ) => StructuredJsonValue;
  /**
   * boolean
   */
  readonly boolean: (a: boolean) => StructuredJsonValue;
  /**
   * null
   */
  readonly null: StructuredJsonValue;
  /**
   * number
   */
  readonly number: (a: number) => StructuredJsonValue;
  /**
   * object
   */
  readonly object: (
    a: globalThis.ReadonlyMap<string, StructuredJsonValue>
  ) => StructuredJsonValue;
} = {
  description: "構造化されたJSON",
  fromStructuredJsonValue: (
    jsonValue: a.StructuredJsonValue
  ): StructuredJsonValue => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in StructuredJsonValue.fromJson");
    }
    const type: a.StructuredJsonValue | undefined = jsonValue.value.get("type");
    if (type === undefined || type.type !== "string") {
      throw new Error("expected type property type is string");
    }
    switch (type.value) {
      case "string": {
        const value: a.StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.string(
          String.fromStructuredJsonValue(value)
        );
      }
      case "array": {
        const value: a.StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.array(
          List.fromStructuredJsonValue(
            StructuredJsonValue.fromStructuredJsonValue
          )(value)
        );
      }
      case "boolean": {
        const value: a.StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.boolean(Bool.fromStructuredJsonValue(value));
      }
      case "null": {
        return StructuredJsonValue.null;
      }
      case "number": {
        const value: a.StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.number(
          Number.fromStructuredJsonValue(value)
        );
      }
      case "object": {
        const value: a.StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.object(
          StringMap.fromStructuredJsonValue(
            StructuredJsonValue.fromStructuredJsonValue
          )(value)
        );
      }
    }
    throw new Error(
      "unknown type value expected [string,array,boolean,null,number,object] but got " +
        type.value
    );
  },
  string: (p: string): StructuredJsonValue => ({
    type: "string",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  }),
  array: (
    p: globalThis.ReadonlyArray<StructuredJsonValue>
  ): StructuredJsonValue => ({
    type: "array",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  }),
  boolean: (p: boolean): StructuredJsonValue => ({
    type: "boolean",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  }),
  null: {
    type: "null",
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  },
  number: (p: number): StructuredJsonValue => ({
    type: "number",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  }),
  object: (
    p: globalThis.ReadonlyMap<string, StructuredJsonValue>
  ): StructuredJsonValue => ({
    type: "object",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue",
  }),
};

/**
 * キーが string の ReadonlyMap
 */
export const StringMap: {
  /**
   * StringMap の説明文
   */
  readonly description: string;
  /**
   * JsonからStringMapに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: <p0 extends unknown>(
    a: (a: a.StructuredJsonValue) => p0
  ) => (a: a.StructuredJsonValue) => globalThis.ReadonlyMap<string, p0>;
} = {
  description: "キーが string の ReadonlyMap",
  fromStructuredJsonValue:
    <p0 extends unknown>(
      p0FromJson: (a: a.StructuredJsonValue) => p0
    ): ((a: a.StructuredJsonValue) => globalThis.ReadonlyMap<string, p0>) =>
    (jsonValue: a.StructuredJsonValue): globalThis.ReadonlyMap<string, p0> => {
      throw new Error(
        "expected stringMap in StringMap.fromStructuredJsonValue"
      );
    },
};

/**
 * リスト
 */
export const List: {
  /**
   * List の説明文
   */
  readonly description: string;
  /**
   * JsonからListに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: <p0 extends unknown>(
    a: (a: a.StructuredJsonValue) => p0
  ) => (a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>;
} = {
  description: "リスト",
  fromStructuredJsonValue:
    <p0 extends unknown>(
      p0FromJson: (a: a.StructuredJsonValue) => p0
    ): ((a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>) =>
    (jsonValue: a.StructuredJsonValue): globalThis.ReadonlyArray<p0> => {
      if (jsonValue.type === "array") {
        return jsonValue.value.map(p0FromJson);
      }
      throw new Error("expected array in List.fromStructuredJsonValue");
    },
};

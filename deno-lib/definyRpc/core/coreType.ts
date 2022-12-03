/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "./maybe.ts";

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
      readonly value: globalThis.ReadonlyMap<string, StructuredJsonValue>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.StructuredJsonValue";
    };

/**
 * 名前空間. ユーザーが生成するものがこっちが用意するものか
 */
export type Namespace =
  | {
      /**
       * ユーザーが作ったAPIがあるところ
       */
      readonly type: "local";
      /**
       * ユーザーが作ったAPIがあるところ
       */
      readonly value: globalThis.ReadonlyArray<string>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    }
  | {
      /**
       * definyRpc 共通で使われる型
       */
      readonly type: "coreType";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    }
  | {
      /**
       * 型安全なJSONのコーデック
       */
      readonly type: "typedJson";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    }
  | {
      /**
       * HTTP経路でAPI呼ぶときに使うコード
       */
      readonly type: "request";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    }
  | {
      /**
       * MaybeとResultがある (一時的対処. coreTypeに入れたい)
       */
      readonly type: "maybe";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    }
  | {
      /**
       * 各サーバーにアクセスし型情報を取得する
       */
      readonly type: "meta";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.Namespace";
    };

/**
 * definy RPC 型の構造
 */
export type DefinyRpcTypeInfo = {
  /**
   * 型が所属する名前空間
   */
  readonly namespace: Namespace;
  /**
   * 型の名前
   */
  readonly name: string;
  /**
   * 説明文. コメントなどに出力される
   */
  readonly description: string;
  /**
   * パラメーターの数. パラメーター名やドキュメントはまたいつか復活させる
   */
  readonly parameterCount: number;
  /**
   * 型の構造を表現する
   */
  readonly body: TypeBody;
  readonly [globalThis.Symbol.toStringTag]: "*coreType.DefinyRpcTypeInfo";
};

/**
 * 型の構造を表現する
 */
export type TypeBody =
  | {
      /**
       * string
       */
      readonly type: "string";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * number
       */
      readonly type: "number";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * boolean
       */
      readonly type: "boolean";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * unit
       */
      readonly type: "unit";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * list
       */
      readonly type: "list";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * set
       */
      readonly type: "set";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * map
       */
      readonly type: "map";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * url
       */
      readonly type: "url";
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * product
       */
      readonly type: "product";
      /**
       * product
       */
      readonly value: globalThis.ReadonlyArray<Field>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    }
  | {
      /**
       * sum
       */
      readonly type: "sum";
      /**
       * sum
       */
      readonly value: globalThis.ReadonlyArray<Pattern>;
      readonly [globalThis.Symbol.toStringTag]: "*coreType.TypeBody";
    };

/**
 * product 直積型で使う
 */
export type Field = {
  /**
   * フィールド名
   */
  readonly name: string;
  /**
   * フィールドの説明
   */
  readonly description: string;
  /**
   * 型
   */
  readonly type: Type;
  readonly [globalThis.Symbol.toStringTag]: "*coreType.Field";
};

/**
 * 直和型の表現
 */
export type Pattern = {
  /**
   * パターン名
   */
  readonly name: string;
  /**
   * 説明
   */
  readonly description: string;
  /**
   * パラメーター
   */
  readonly parameter: a.Maybe<Type>;
  readonly [globalThis.Symbol.toStringTag]: "*coreType.Pattern";
};

/**
 * 型
 */
export type Type = {
  /**
   * 名前空間
   */
  readonly namespace: Namespace;
  /**
   * 型の名前
   */
  readonly name: string;
  /**
   * 型パラメータ
   */
  readonly parameters: globalThis.ReadonlyArray<Type>;
  readonly [globalThis.Symbol.toStringTag]: "*coreType.Type";
};

/**
 * 文字列
 */
export const String: {
  /**
   * String の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * String の型
   */
  readonly type: () => Type;
  /**
   * JsonからStringに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => string;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "String",
      description: "文字列",
      parameterCount: 0,
      body: TypeBody.string,
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "String",
      parameters: [],
    }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): string => {
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
   * Bool の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Bool の型
   */
  readonly type: () => Type;
  /**
   * JsonからBoolに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => boolean;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Bool",
      description: "Bool. boolean. 真偽値. True か False",
      parameterCount: 0,
      body: TypeBody.boolean,
    }),
  type: (): Type =>
    Type.from({ namespace: Namespace.coreType, name: "Bool", parameters: [] }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): boolean => {
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
   * Number の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Number の型
   */
  readonly type: () => Type;
  /**
   * JsonからNumberに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => number;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Number",
      description: "64bit 浮動小数点数",
      parameterCount: 0,
      body: TypeBody.number,
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "Number",
      parameters: [],
    }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): number => {
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
   * StructuredJsonValue の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * StructuredJsonValue の型
   */
  readonly type: () => Type;
  /**
   * JsonからStructuredJsonValueに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (
    a: StructuredJsonValue
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
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "StructuredJsonValue",
      description: "構造化されたJSON",
      parameterCount: 0,
      body: TypeBody.sum([
        Pattern.from({
          name: "string",
          description: "string",
          parameter: { type: "just", value: String.type() },
        }),
        Pattern.from({
          name: "array",
          description: "array",
          parameter: {
            type: "just",
            value: List.type(StructuredJsonValue.type()),
          },
        }),
        Pattern.from({
          name: "boolean",
          description: "boolean",
          parameter: { type: "just", value: Bool.type() },
        }),
        Pattern.from({
          name: "null",
          description: "null",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "number",
          description: "number",
          parameter: { type: "just", value: Number.type() },
        }),
        Pattern.from({
          name: "object",
          description: "object",
          parameter: {
            type: "just",
            value: Map.type(String.type(), StructuredJsonValue.type()),
          },
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "StructuredJsonValue",
      parameters: [],
    }),
  fromStructuredJsonValue: (
    jsonValue: StructuredJsonValue
  ): StructuredJsonValue => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in StructuredJsonValue.fromJson");
    }
    const type: StructuredJsonValue | undefined = jsonValue.value.get("type");
    if (type === undefined || type.type !== "string") {
      throw new Error("expected type property type is string");
    }
    switch (type.value) {
      case "string": {
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.string(
          String.fromStructuredJsonValue(value)
        );
      }
      case "array": {
        const value: StructuredJsonValue | undefined =
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
        const value: StructuredJsonValue | undefined =
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
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.number(
          Number.fromStructuredJsonValue(value)
        );
      }
      case "object": {
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return StructuredJsonValue.object(
          Map.fromStructuredJsonValue(
            String.fromStructuredJsonValue,
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
 * リスト
 */
export const List: {
  /**
   * List の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * List の型
   */
  readonly type: (a: Type) => Type;
  /**
   * JsonからListに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: <p0 extends unknown>(
    a: (a: StructuredJsonValue) => p0
  ) => (a: StructuredJsonValue) => globalThis.ReadonlyArray<p0>;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "List",
      description: "リスト",
      parameterCount: 1,
      body: TypeBody.list,
    }),
  type: (p0: Type): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "List",
      parameters: [p0],
    }),
  fromStructuredJsonValue:
    <p0 extends unknown>(
      p0FromJson: (a: StructuredJsonValue) => p0
    ): ((a: StructuredJsonValue) => globalThis.ReadonlyArray<p0>) =>
    (jsonValue: StructuredJsonValue): globalThis.ReadonlyArray<p0> => {
      if (jsonValue.type === "array") {
        return jsonValue.value.map(p0FromJson);
      }
      throw new Error("expected array in List.fromStructuredJsonValue");
    },
};

/**
 * 辞書型. Map, Dictionary
 */
export const Map: {
  /**
   * Map の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Map の型
   */
  readonly type: (a: Type, b: Type) => Type;
  /**
   * JsonからMapに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: <p0 extends unknown, p1 extends unknown>(
    a: (a: StructuredJsonValue) => p0,
    b: (a: StructuredJsonValue) => p1
  ) => (a: StructuredJsonValue) => globalThis.ReadonlyMap<p0, p1>;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Map",
      description: "辞書型. Map, Dictionary",
      parameterCount: 2,
      body: TypeBody.map,
    }),
  type: (p0: Type, p1: Type): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "Map",
      parameters: [p0, p1],
    }),
  fromStructuredJsonValue:
    <p0 extends unknown, p1 extends unknown>(
      p0FromJson: (a: StructuredJsonValue) => p0,
      p1FromJson: (a: StructuredJsonValue) => p1
    ): ((a: StructuredJsonValue) => globalThis.ReadonlyMap<p0, p1>) =>
    (jsonValue: StructuredJsonValue): globalThis.ReadonlyMap<p0, p1> => {
      throw new Error("expected stringMap in Map.fromStructuredJsonValue");
    },
};

/**
 * 名前空間. ユーザーが生成するものがこっちが用意するものか
 */
export const Namespace: {
  /**
   * Namespace の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Namespace の型
   */
  readonly type: () => Type;
  /**
   * JsonからNamespaceに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => Namespace;
  /**
   * ユーザーが作ったAPIがあるところ
   */
  readonly local: (a: globalThis.ReadonlyArray<string>) => Namespace;
  /**
   * definyRpc 共通で使われる型
   */
  readonly coreType: Namespace;
  /**
   * 型安全なJSONのコーデック
   */
  readonly typedJson: Namespace;
  /**
   * HTTP経路でAPI呼ぶときに使うコード
   */
  readonly request: Namespace;
  /**
   * MaybeとResultがある (一時的対処. coreTypeに入れたい)
   */
  readonly maybe: Namespace;
  /**
   * 各サーバーにアクセスし型情報を取得する
   */
  readonly meta: Namespace;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Namespace",
      description: "名前空間. ユーザーが生成するものがこっちが用意するものか",
      parameterCount: 0,
      body: TypeBody.sum([
        Pattern.from({
          name: "local",
          description: "ユーザーが作ったAPIがあるところ",
          parameter: { type: "just", value: List.type(String.type()) },
        }),
        Pattern.from({
          name: "coreType",
          description: "definyRpc 共通で使われる型",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "typedJson",
          description: "型安全なJSONのコーデック",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "request",
          description: "HTTP経路でAPI呼ぶときに使うコード",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "maybe",
          description: "MaybeとResultがある (一時的対処. coreTypeに入れたい)",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "meta",
          description: "各サーバーにアクセスし型情報を取得する",
          parameter: { type: "nothing" },
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "Namespace",
      parameters: [],
    }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): Namespace => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in Namespace.fromJson");
    }
    const type: StructuredJsonValue | undefined = jsonValue.value.get("type");
    if (type === undefined || type.type !== "string") {
      throw new Error("expected type property type is string");
    }
    switch (type.value) {
      case "local": {
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return Namespace.local(
          List.fromStructuredJsonValue(String.fromStructuredJsonValue)(value)
        );
      }
      case "coreType": {
        return Namespace.coreType;
      }
      case "typedJson": {
        return Namespace.typedJson;
      }
      case "request": {
        return Namespace.request;
      }
      case "maybe": {
        return Namespace.maybe;
      }
      case "meta": {
        return Namespace.meta;
      }
    }
    throw new Error(
      "unknown type value expected [local,coreType,typedJson,request,maybe,meta] but got " +
        type.value
    );
  },
  local: (p: globalThis.ReadonlyArray<string>): Namespace => ({
    type: "local",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  }),
  coreType: {
    type: "coreType",
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  },
  typedJson: {
    type: "typedJson",
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  },
  request: {
    type: "request",
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  },
  maybe: {
    type: "maybe",
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  },
  meta: {
    type: "meta",
    [globalThis.Symbol.toStringTag]: "*coreType.Namespace",
  },
};

/**
 * definy RPC 型の構造
 */
export const DefinyRpcTypeInfo: {
  /**
   * DefinyRpcTypeInfo の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * DefinyRpcTypeInfo の型
   */
  readonly type: () => Type;
  /**
   * オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない
   */
  readonly from: (
    a: globalThis.Omit<DefinyRpcTypeInfo, typeof globalThis.Symbol.toStringTag>
  ) => DefinyRpcTypeInfo;
  /**
   * JsonからDefinyRpcTypeInfoに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (
    a: StructuredJsonValue
  ) => DefinyRpcTypeInfo;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "DefinyRpcTypeInfo",
      description: "definy RPC 型の構造",
      parameterCount: 0,
      body: TypeBody.product([
        Field.from({
          name: "namespace",
          description: "型が所属する名前空間",
          type: Namespace.type(),
        }),
        Field.from({
          name: "name",
          description: "型の名前",
          type: String.type(),
        }),
        Field.from({
          name: "description",
          description: "説明文. コメントなどに出力される",
          type: String.type(),
        }),
        Field.from({
          name: "parameterCount",
          description:
            "パラメーターの数. パラメーター名やドキュメントはまたいつか復活させる",
          type: Number.type(),
        }),
        Field.from({
          name: "body",
          description: "型の構造を表現する",
          type: TypeBody.type(),
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "DefinyRpcTypeInfo",
      parameters: [],
    }),
  from: (
    obj: globalThis.Omit<
      DefinyRpcTypeInfo,
      typeof globalThis.Symbol.toStringTag
    >
  ): DefinyRpcTypeInfo => ({
    namespace: obj.namespace,
    name: obj.name,
    description: obj.description,
    parameterCount: obj.parameterCount,
    body: obj.body,
    [globalThis.Symbol.toStringTag]: "*coreType.DefinyRpcTypeInfo",
  }),
  fromStructuredJsonValue: (
    jsonValue: StructuredJsonValue
  ): DefinyRpcTypeInfo => {
    if (jsonValue.type !== "object") {
      throw new Error(
        "expected object in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    const namespace: StructuredJsonValue | undefined =
      jsonValue.value.get("namespace");
    if (namespace === undefined) {
      throw new Error(
        "expected namespace field. in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    const name: StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error(
        "expected name field. in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    const description: StructuredJsonValue | undefined =
      jsonValue.value.get("description");
    if (description === undefined) {
      throw new Error(
        "expected description field. in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    const parameterCount: StructuredJsonValue | undefined =
      jsonValue.value.get("parameterCount");
    if (parameterCount === undefined) {
      throw new Error(
        "expected parameterCount field. in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    const body: StructuredJsonValue | undefined = jsonValue.value.get("body");
    if (body === undefined) {
      throw new Error(
        "expected body field. in DefinyRpcTypeInfo.fromStructuredJsonValue"
      );
    }
    return DefinyRpcTypeInfo.from({
      namespace: Namespace.fromStructuredJsonValue(namespace),
      name: String.fromStructuredJsonValue(name),
      description: String.fromStructuredJsonValue(description),
      parameterCount: Number.fromStructuredJsonValue(parameterCount),
      body: TypeBody.fromStructuredJsonValue(body),
    });
  },
};

/**
 * 型の構造を表現する
 */
export const TypeBody: {
  /**
   * TypeBody の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * TypeBody の型
   */
  readonly type: () => Type;
  /**
   * JsonからTypeBodyに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => TypeBody;
  /**
   * string
   */
  readonly string: TypeBody;
  /**
   * number
   */
  readonly number: TypeBody;
  /**
   * boolean
   */
  readonly boolean: TypeBody;
  /**
   * unit
   */
  readonly unit: TypeBody;
  /**
   * list
   */
  readonly list: TypeBody;
  /**
   * set
   */
  readonly set: TypeBody;
  /**
   * map
   */
  readonly map: TypeBody;
  /**
   * url
   */
  readonly url: TypeBody;
  /**
   * product
   */
  readonly product: (a: globalThis.ReadonlyArray<Field>) => TypeBody;
  /**
   * sum
   */
  readonly sum: (a: globalThis.ReadonlyArray<Pattern>) => TypeBody;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "TypeBody",
      description: "型の構造を表現する",
      parameterCount: 0,
      body: TypeBody.sum([
        Pattern.from({
          name: "string",
          description: "string",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "number",
          description: "number",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "boolean",
          description: "boolean",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "unit",
          description: "unit",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "list",
          description: "list",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "set",
          description: "set",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "map",
          description: "map",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "url",
          description: "url",
          parameter: { type: "nothing" },
        }),
        Pattern.from({
          name: "product",
          description: "product",
          parameter: { type: "just", value: List.type(Field.type()) },
        }),
        Pattern.from({
          name: "sum",
          description: "sum",
          parameter: { type: "just", value: List.type(Pattern.type()) },
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "TypeBody",
      parameters: [],
    }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): TypeBody => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in TypeBody.fromJson");
    }
    const type: StructuredJsonValue | undefined = jsonValue.value.get("type");
    if (type === undefined || type.type !== "string") {
      throw new Error("expected type property type is string");
    }
    switch (type.value) {
      case "string": {
        return TypeBody.string;
      }
      case "number": {
        return TypeBody.number;
      }
      case "boolean": {
        return TypeBody.boolean;
      }
      case "unit": {
        return TypeBody.unit;
      }
      case "list": {
        return TypeBody.list;
      }
      case "set": {
        return TypeBody.set;
      }
      case "map": {
        return TypeBody.map;
      }
      case "url": {
        return TypeBody.url;
      }
      case "product": {
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return TypeBody.product(
          List.fromStructuredJsonValue(Field.fromStructuredJsonValue)(value)
        );
      }
      case "sum": {
        const value: StructuredJsonValue | undefined =
          jsonValue.value.get("value");
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return TypeBody.sum(
          List.fromStructuredJsonValue(Pattern.fromStructuredJsonValue)(value)
        );
      }
    }
    throw new Error(
      "unknown type value expected [string,number,boolean,unit,list,set,map,url,product,sum] but got " +
        type.value
    );
  },
  string: {
    type: "string",
    [globalThis.Symbol.toStringTag]: "*coreType.TypeBody",
  },
  number: {
    type: "number",
    [globalThis.Symbol.toStringTag]: "*coreType.TypeBody",
  },
  boolean: {
    type: "boolean",
    [globalThis.Symbol.toStringTag]: "*coreType.TypeBody",
  },
  unit: { type: "unit", [globalThis.Symbol.toStringTag]: "*coreType.TypeBody" },
  list: { type: "list", [globalThis.Symbol.toStringTag]: "*coreType.TypeBody" },
  set: { type: "set", [globalThis.Symbol.toStringTag]: "*coreType.TypeBody" },
  map: { type: "map", [globalThis.Symbol.toStringTag]: "*coreType.TypeBody" },
  url: { type: "url", [globalThis.Symbol.toStringTag]: "*coreType.TypeBody" },
  product: (p: globalThis.ReadonlyArray<Field>): TypeBody => ({
    type: "product",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.TypeBody",
  }),
  sum: (p: globalThis.ReadonlyArray<Pattern>): TypeBody => ({
    type: "sum",
    value: p,
    [globalThis.Symbol.toStringTag]: "*coreType.TypeBody",
  }),
};

/**
 * product 直積型で使う
 */
export const Field: {
  /**
   * Field の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Field の型
   */
  readonly type: () => Type;
  /**
   * オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない
   */
  readonly from: (
    a: globalThis.Omit<Field, typeof globalThis.Symbol.toStringTag>
  ) => Field;
  /**
   * JsonからFieldに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => Field;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Field",
      description: "product 直積型で使う",
      parameterCount: 0,
      body: TypeBody.product([
        Field.from({
          name: "name",
          description: "フィールド名",
          type: String.type(),
        }),
        Field.from({
          name: "description",
          description: "フィールドの説明",
          type: String.type(),
        }),
        Field.from({ name: "type", description: "型", type: Type.type() }),
      ]),
    }),
  type: (): Type =>
    Type.from({ namespace: Namespace.coreType, name: "Field", parameters: [] }),
  from: (
    obj: globalThis.Omit<Field, typeof globalThis.Symbol.toStringTag>
  ): Field => ({
    name: obj.name,
    description: obj.description,
    type: obj.type,
    [globalThis.Symbol.toStringTag]: "*coreType.Field",
  }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): Field => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in Field.fromStructuredJsonValue");
    }
    const name: StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error("expected name field. in Field.fromStructuredJsonValue");
    }
    const description: StructuredJsonValue | undefined =
      jsonValue.value.get("description");
    if (description === undefined) {
      throw new Error(
        "expected description field. in Field.fromStructuredJsonValue"
      );
    }
    const type: StructuredJsonValue | undefined = jsonValue.value.get("type");
    if (type === undefined) {
      throw new Error("expected type field. in Field.fromStructuredJsonValue");
    }
    return Field.from({
      name: String.fromStructuredJsonValue(name),
      description: String.fromStructuredJsonValue(description),
      type: Type.fromStructuredJsonValue(type),
    });
  },
};

/**
 * 直和型の表現
 */
export const Pattern: {
  /**
   * Pattern の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Pattern の型
   */
  readonly type: () => Type;
  /**
   * オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない
   */
  readonly from: (
    a: globalThis.Omit<Pattern, typeof globalThis.Symbol.toStringTag>
  ) => Pattern;
  /**
   * JsonからPatternに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => Pattern;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Pattern",
      description: "直和型の表現",
      parameterCount: 0,
      body: TypeBody.product([
        Field.from({
          name: "name",
          description: "パターン名",
          type: String.type(),
        }),
        Field.from({
          name: "description",
          description: "説明",
          type: String.type(),
        }),
        Field.from({
          name: "parameter",
          description: "パラメーター",
          type: a.Maybe.type(Type.type()),
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({
      namespace: Namespace.coreType,
      name: "Pattern",
      parameters: [],
    }),
  from: (
    obj: globalThis.Omit<Pattern, typeof globalThis.Symbol.toStringTag>
  ): Pattern => ({
    name: obj.name,
    description: obj.description,
    parameter: obj.parameter,
    [globalThis.Symbol.toStringTag]: "*coreType.Pattern",
  }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): Pattern => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in Pattern.fromStructuredJsonValue");
    }
    const name: StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error(
        "expected name field. in Pattern.fromStructuredJsonValue"
      );
    }
    const description: StructuredJsonValue | undefined =
      jsonValue.value.get("description");
    if (description === undefined) {
      throw new Error(
        "expected description field. in Pattern.fromStructuredJsonValue"
      );
    }
    const parameter: StructuredJsonValue | undefined =
      jsonValue.value.get("parameter");
    if (parameter === undefined) {
      throw new Error(
        "expected parameter field. in Pattern.fromStructuredJsonValue"
      );
    }
    return Pattern.from({
      name: String.fromStructuredJsonValue(name),
      description: String.fromStructuredJsonValue(description),
      parameter: a.Maybe.fromStructuredJsonValue(Type.fromStructuredJsonValue)(
        parameter
      ),
    });
  },
};

/**
 * 型
 */
export const Type: {
  /**
   * Type の型の表現
   */
  readonly typeInfo: () => DefinyRpcTypeInfo;
  /**
   * Type の型
   */
  readonly type: () => Type;
  /**
   * オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない
   */
  readonly from: (
    a: globalThis.Omit<Type, typeof globalThis.Symbol.toStringTag>
  ) => Type;
  /**
   * JsonからTypeに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => Type;
} = {
  typeInfo: (): DefinyRpcTypeInfo =>
    DefinyRpcTypeInfo.from({
      namespace: Namespace.coreType,
      name: "Type",
      description: "型",
      parameterCount: 0,
      body: TypeBody.product([
        Field.from({
          name: "namespace",
          description: "名前空間",
          type: Namespace.type(),
        }),
        Field.from({
          name: "name",
          description: "型の名前",
          type: String.type(),
        }),
        Field.from({
          name: "parameters",
          description: "型パラメータ",
          type: List.type(Type.type()),
        }),
      ]),
    }),
  type: (): Type =>
    Type.from({ namespace: Namespace.coreType, name: "Type", parameters: [] }),
  from: (
    obj: globalThis.Omit<Type, typeof globalThis.Symbol.toStringTag>
  ): Type => ({
    namespace: obj.namespace,
    name: obj.name,
    parameters: obj.parameters,
    [globalThis.Symbol.toStringTag]: "*coreType.Type",
  }),
  fromStructuredJsonValue: (jsonValue: StructuredJsonValue): Type => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in Type.fromStructuredJsonValue");
    }
    const namespace: StructuredJsonValue | undefined =
      jsonValue.value.get("namespace");
    if (namespace === undefined) {
      throw new Error(
        "expected namespace field. in Type.fromStructuredJsonValue"
      );
    }
    const name: StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error("expected name field. in Type.fromStructuredJsonValue");
    }
    const parameters: StructuredJsonValue | undefined =
      jsonValue.value.get("parameters");
    if (parameters === undefined) {
      throw new Error(
        "expected parameters field. in Type.fromStructuredJsonValue"
      );
    }
    return Type.from({
      namespace: Namespace.fromStructuredJsonValue(namespace),
      name: String.fromStructuredJsonValue(name),
      parameters: List.fromStructuredJsonValue(Type.fromStructuredJsonValue)(
        parameters
      ),
    });
  },
};

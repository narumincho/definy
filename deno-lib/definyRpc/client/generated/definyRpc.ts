/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/4983eef4d98387d8843f4085f799ad22aee5993c/deno-lib/typedJson.ts";

/**
 * 取得した結果
 */
export type Result<ok extends unknown, error extends unknown> =
  | { readonly type: "ok"; readonly ok: ok }
  | { readonly type: "error"; readonly error: error };

/**
 * 認証が必要なリクエストに使用する
 */
export type AccountToken = string & { readonly __accountTokenBland: never };

/**
 * functionByNameの結果
 */
export type FunctionDetail = {
  /**
   * 名前空間付き, 関数名
   */
  readonly name: globalThis.ReadonlyArray<string>;
  /**
   * 関数の説明文
   */
  readonly description: string;
  /**
   * 関数の入力の型
   */
  readonly input: Type;
  /**
   * 関数の出力の型
   */
  readonly output: Type;
};

/**
 * definyRpc で表現できる型
 */
export type Type = {
  /**
   * 完全名
   */
  readonly fullName: globalThis.ReadonlyArray<string>;
  readonly description: string;
  /**
   * 型パラメーター
   */
  readonly parameters: globalThis.ReadonlyArray<Type>;
};

/**
 * 構造化されたJSON
 */
export type StructuredJsonValue =
  | {
      /**
       * string
       */
      readonly type_: "string";
      /**
       * string
       */
      readonly value: string;
    }
  | {
      /**
       * array
       */
      readonly type_: "array";
      /**
       * array
       */
      readonly value: globalThis.ReadonlyArray<StructuredJsonValue>;
    }
  | {
      /**
       * boolean
       */
      readonly type_: "boolean";
      /**
       * boolean
       */
      readonly value: Bool;
    }
  | {
      /**
       * null
       */
      readonly type_: "null";
      /**
       * null
       */
      readonly value: undefined;
    }
  | {
      /**
       * number
       */
      readonly type_: "number";
      /**
       * number
       */
      readonly value: number;
    }
  | {
      /**
       * object
       */
      readonly type_: "object";
      /**
       * object
       */
      readonly value: StringMap<StructuredJsonValue>;
    };

/**
 * Bool. boolean. 真偽値. True か False
 */
export type Bool = boolean;

/**
 * キーが string の ReadonlyMap
 */
export type StringMap<p0 extends unknown> = globalThis.ReadonlyMap<
  string,
  StructuredJsonValue
>;

/**
 * 内部表現は, undefined. JSON 上では null
 */
export const Unit: {
  /**
   * Unit の説明文
   */
  readonly description: string;
  /**
   * JsonからUnitに変換する. 失敗した場合はエラー
   */
  readonly fromJson: (a: a.StructuredJsonValue) => undefined;
} = {
  description: "内部表現は, undefined. JSON 上では null",
  fromJson: (jsonValue: a.StructuredJsonValue): undefined => undefined,
};

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
  readonly fromJson: (a: a.StructuredJsonValue) => string;
} = {
  description: "文字列",
  fromJson: (jsonValue: a.StructuredJsonValue): string => {
    if (jsonValue.type === "string") {
      return jsonValue.value;
    }
    throw new Error("expected string in String json fromJson");
  },
};

/**
 * 集合. Set
 */
export const Set: {
  /**
   * Set の説明文
   */
  readonly description: string;
  /**
   * JsonからSetに変換する. 失敗した場合はエラー
   */
  readonly fromJson: <p0 extends unknown>(
    a: (a: a.StructuredJsonValue) => p0
  ) => (a: a.StructuredJsonValue) => globalThis.ReadonlySet<p0>;
} = {
  description: "集合. Set",
  fromJson:
    <p0 extends unknown>(
      p0FromJson: (a: a.StructuredJsonValue) => p0
    ): ((a: a.StructuredJsonValue) => globalThis.ReadonlySet<p0>) =>
    (jsonValue: a.StructuredJsonValue): globalThis.ReadonlySet<p0> => {
      if (jsonValue.type === "array") {
        return new globalThis.Set(jsonValue.value.map(p0FromJson));
      }
      throw new Error("expected array in Set json fromJson");
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
  readonly fromJson: <p0 extends unknown>(
    a: (a: a.StructuredJsonValue) => p0
  ) => (a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>;
} = {
  description: "リスト",
  fromJson:
    <p0 extends unknown>(
      p0FromJson: (a: a.StructuredJsonValue) => p0
    ): ((a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>) =>
    (jsonValue: a.StructuredJsonValue): globalThis.ReadonlyArray<p0> => {
      if (jsonValue.type === "array") {
        return jsonValue.value.map(p0FromJson);
      }
      throw new Error("expected array in List json fromJson");
    },
};

/**
 * functionByNameの結果
 */
export const FunctionDetail: {
  /**
   * FunctionDetail の説明文
   */
  readonly description: string;
  /**
   * JsonからFunctionDetailに変換する. 失敗した場合はエラー
   */
  readonly fromJson: (a: a.StructuredJsonValue) => FunctionDetail;
} = {
  description: "functionByNameの結果",
  fromJson: (jsonValue: a.StructuredJsonValue): FunctionDetail => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in FunctionDetail.fromJson");
    }
    const name: a.StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error("expected name field. in FunctionDetail.fromJson");
    }
    const description: a.StructuredJsonValue | undefined =
      jsonValue.value.get("description");
    if (description === undefined) {
      throw new Error("expected description field. in FunctionDetail.fromJson");
    }
    const input: a.StructuredJsonValue | undefined =
      jsonValue.value.get("input");
    if (input === undefined) {
      throw new Error("expected input field. in FunctionDetail.fromJson");
    }
    const output: a.StructuredJsonValue | undefined =
      jsonValue.value.get("output");
    if (output === undefined) {
      throw new Error("expected output field. in FunctionDetail.fromJson");
    }
    return {
      name: List.fromJson(String.fromJson)(name),
      description: String.fromJson(description),
      input: Type.fromJson(input),
      output: Type.fromJson(output),
    };
  },
};

/**
 * definyRpc で表現できる型
 */
export const Type: {
  /**
   * Type の説明文
   */
  readonly description: string;
  /**
   * JsonからTypeに変換する. 失敗した場合はエラー
   */
  readonly fromJson: (a: a.StructuredJsonValue) => Type;
} = {
  description: "definyRpc で表現できる型",
  fromJson: (jsonValue: a.StructuredJsonValue): Type => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in Type.fromJson");
    }
    const fullName: a.StructuredJsonValue | undefined =
      jsonValue.value.get("fullName");
    if (fullName === undefined) {
      throw new Error("expected fullName field. in Type.fromJson");
    }
    const description: a.StructuredJsonValue | undefined =
      jsonValue.value.get("description");
    if (description === undefined) {
      throw new Error("expected description field. in Type.fromJson");
    }
    const parameters: a.StructuredJsonValue | undefined =
      jsonValue.value.get("parameters");
    if (parameters === undefined) {
      throw new Error("expected parameters field. in Type.fromJson");
    }
    return {
      fullName: List.fromJson(String.fromJson)(fullName),
      description: String.fromJson(description),
      parameters: List.fromJson(Type.fromJson)(parameters),
    };
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
  readonly fromJson: (a: a.StructuredJsonValue) => StructuredJsonValue;
} = {
  description: "構造化されたJSON",
  fromJson: (jsonValue: a.StructuredJsonValue): StructuredJsonValue => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in StructuredJsonValue.fromJson");
    }
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
  readonly fromJson: (a: a.StructuredJsonValue) => Bool;
} = {
  description: "Bool. boolean. 真偽値. True か False",
  fromJson: (jsonValue: a.StructuredJsonValue): Bool => {
    if (jsonValue.type === "boolean") {
      return jsonValue.value;
    }
    throw new Error("expected boolean in boolean json fromJson");
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
  readonly fromJson: (a: a.StructuredJsonValue) => number;
} = {
  description: "64bit 浮動小数点数",
  fromJson: (jsonValue: a.StructuredJsonValue): number => {
    if (jsonValue.type === "number") {
      return jsonValue.value;
    }
    throw new Error("expected number in Number json fromJson");
  },
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
  readonly fromJson: <p0 extends unknown>(
    a: (a: a.StructuredJsonValue) => p0
  ) => (a: a.StructuredJsonValue) => StringMap<p0>;
} = {
  description: "キーが string の ReadonlyMap",
  fromJson:
    <p0 extends unknown>(
      p0FromJson: (a: a.StructuredJsonValue) => p0
    ): ((a: a.StructuredJsonValue) => StringMap<p0>) =>
    (jsonValue: a.StructuredJsonValue): StringMap<p0> => {
      throw new Error("expected stringMap in stringMap json fromJson");
    },
};

/**
 * サーバー名の取得
 */
export const name = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/name";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromJson(a.rawJsonToStructuredJsonValue(jsonValue)),
      })
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク
 */
export const namespaceList = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<
  Result<globalThis.ReadonlySet<globalThis.ReadonlyArray<string>>, "error">
> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/namespaceList";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (
        jsonValue: a.RawJsonValue
      ): Result<
        globalThis.ReadonlySet<globalThis.ReadonlyArray<string>>,
        "error"
      > => ({
        type: "ok",
        ok: Set.fromJson(List.fromJson(String.fromJson))(
          a.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): Result<
        globalThis.ReadonlySet<globalThis.ReadonlyArray<string>>,
        "error"
      > => ({ type: "error", error: "error" })
    );
};

/**
 * 名前から関数を検索する (公開APIのみ)
 */
export const functionListByName = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<FunctionDetail>, "error">
> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/functionListByName";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (
        jsonValue: a.RawJsonValue
      ): Result<globalThis.ReadonlyArray<FunctionDetail>, "error"> => ({
        type: "ok",
        ok: List.fromJson(FunctionDetail.fromJson)(
          a.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): Result<globalThis.ReadonlyArray<FunctionDetail>, "error"> => ({
        type: "error",
        error: "error",
      })
    );
};

/**
 * 名前から関数を検索する (非公開API)
 */
export const functionListByNamePrivate = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
  readonly accountToken: AccountToken;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<FunctionDetail>, "error">
> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/functionListByNamePrivate";
  return globalThis
    .fetch(url, { headers: { authorization: parameter.accountToken } })
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (
        jsonValue: a.RawJsonValue
      ): Result<globalThis.ReadonlyArray<FunctionDetail>, "error"> => ({
        type: "ok",
        ok: List.fromJson(FunctionDetail.fromJson)(
          a.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): Result<globalThis.ReadonlyArray<FunctionDetail>, "error"> => ({
        type: "error",
        error: "error",
      })
    );
};

/**
 * 名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する
 */
export const generateCallDefinyRpcTypeScriptCode = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname =
    url.pathname + "/definyRpc/generateCallDefinyRpcTypeScriptCode";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromJson(a.rawJsonToStructuredJsonValue(jsonValue)),
      })
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * 指定した名前の関数を呼ぶ
 */
export const callQuery = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
  readonly input: globalThis.ReadonlyArray<string>;
}): globalThis.Promise<Result<StructuredJsonValue, "error">> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/callQuery";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<StructuredJsonValue, "error"> => ({
        type: "ok",
        ok: StructuredJsonValue.fromJson(
          a.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): Result<StructuredJsonValue, "error"> => ({
        type: "error",
        error: "error",
      })
    );
};

/**
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する
 */
export const generateCodeAndWriteAsFileInServer = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<undefined, "error">> => {
  const url: globalThis.URL = new URL(parameter.url ?? "http://localhost:2520");
  url.pathname = url.pathname + "/definyRpc/generateCodeAndWriteAsFileInServer";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<undefined, "error"> => ({
        type: "ok",
        ok: Unit.fromJson(a.rawJsonToStructuredJsonValue(jsonValue)),
      })
    )
    .catch(
      (): Result<undefined, "error"> => ({ type: "error", error: "error" })
    );
};

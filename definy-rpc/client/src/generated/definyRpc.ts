/* eslint-disable */
/* generated by definy. Do not edit! */

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
 * 内部表現は, undefined. JSON 上では null
 */
export const Unit: unknown = {
  description: "内部表現は, undefined. JSON 上では null",
  fromJson: (unit: undefined): undefined => {},
};

/**
 * 文字列
 */
export const String: unknown = {
  description: "文字列",
  fromJson: (string_: string): string => {},
};

/**
 * 集合. Set
 */
export const Set: unknown = {
  description: "集合. Set",
  fromJson: <p0 extends unknown>(
    set_: globalThis.ReadonlySet<p0>
  ): globalThis.ReadonlySet<p0> => {},
};

/**
 * リスト
 */
export const List: unknown = {
  description: "リスト",
  fromJson: <p0 extends unknown>(
    list: globalThis.ReadonlyArray<p0>
  ): globalThis.ReadonlyArray<p0> => {},
};

/**
 * functionByNameの結果
 */
export const FunctionDetail: unknown = {
  description: "functionByNameの結果",
  fromJson: (functionDetail: FunctionDetail): FunctionDetail => {},
};

/**
 * definyRpc で表現できる型
 */
export const Type: unknown = {
  description: "definyRpc で表現できる型",
  fromJson: (type_: Type): Type => {},
};

/**
 * サーバー名の取得
 */
export const name = (parameter: {
  /**
   * api end point
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/name";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then((jsonValue: unknown): Result<string, "error"> => {
      if (typeof jsonValue === "string") {
        return { type: "ok", ok: jsonValue };
      }
      throw new Error("parseError");
    })
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク
 */
export const namespaceList = (parameter: {
  /**
   * api end point
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<globalThis.Set<undefined>, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/namespaceList";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then((jsonValue: unknown): Result<globalThis.Set<undefined>, "error"> => {
      if (typeof jsonValue === "string") {
        return { type: "ok", ok: jsonValue };
      }
      throw new Error("parseError");
    })
    .catch(
      (): Result<globalThis.Set<undefined>, "error"> => ({
        type: "error",
        error: "error",
      })
    );
};

/**
 * 名前から関数を検索する (公開APIのみ)
 */
export const functionListByName = (parameter: {
  /**
   * api end point
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<undefined>, "error">
> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/functionListByName";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then(
      (
        jsonValue: unknown
      ): Result<globalThis.ReadonlyArray<undefined>, "error"> => {
        if (typeof jsonValue === "string") {
          return { type: "ok", ok: jsonValue };
        }
        throw new Error("parseError");
      }
    )
    .catch(
      (): Result<globalThis.ReadonlyArray<undefined>, "error"> => ({
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
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
  readonly accountToken: AccountToken;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<undefined>, "error">
> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/functionListByNamePrivate";
  return globalThis
    .fetch(url, { headers: { authorization: parameter.accountToken } })
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then(
      (
        jsonValue: unknown
      ): Result<globalThis.ReadonlyArray<undefined>, "error"> => {
        if (typeof jsonValue === "string") {
          return { type: "ok", ok: jsonValue };
        }
        throw new Error("parseError");
      }
    )
    .catch(
      (): Result<globalThis.ReadonlyArray<undefined>, "error"> => ({
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
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/generateCallDefinyRpcTypeScriptCode";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then((jsonValue: unknown): Result<string, "error"> => {
      if (typeof jsonValue === "string") {
        return { type: "ok", ok: jsonValue };
      }
      throw new Error("parseError");
    })
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する
 */
export const generateCodeAndWriteAsFileInServer = (parameter: {
  /**
   * api end point
   *     @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<undefined, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = "/definyRpc/generateCodeAndWriteAsFileInServer";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<unknown> =>
        response.json()
    )
    .then((jsonValue: unknown): Result<undefined, "error"> => {
      if (typeof jsonValue === "string") {
        return { type: "ok", ok: jsonValue };
      }
      throw new Error("parseError");
    })
    .catch(
      (): Result<undefined, "error"> => ({ type: "error", error: "error" })
    );
};

import * as a from "./generated/runtime";
import { definyRpcServerPathPrefixAsString } from "./global";

/**
 * 取得した結果
 */
export type Result<ok, error> =
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
export const Unit: {
  /**
   * Unit の説明文
   */
  readonly description: string;
  /**
   * JsonからUnitに変換する. 失敗した場合はエラー
   */
  readonly fromJson: (_a: a.StructuredJsonValue) => undefined;
} = {
  description: "内部表現は, undefined. JSON 上では null",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromJson: (_: a.StructuredJsonValue): undefined => undefined,
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
  readonly fromJson: (_a: a.StructuredJsonValue) => string;
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
  readonly fromJson: <p0>(
    setA: (_a: a.StructuredJsonValue) => p0
  ) => (_a: a.StructuredJsonValue) => globalThis.ReadonlySet<p0>;
} = {
  description: "集合. Set",
  fromJson:
    <p0>(
      p0FromJson: (_a: a.StructuredJsonValue) => p0
    ): ((_a: a.StructuredJsonValue) => globalThis.ReadonlySet<p0>) =>
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
  readonly fromJson: <p0>(
    listA: (_a: a.StructuredJsonValue) => p0
  ) => (_a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>;
} = {
  description: "リスト",
  fromJson:
    <p0>(
      p0FromJson: (_a: a.StructuredJsonValue) => p0
    ): ((_a: a.StructuredJsonValue) => globalThis.ReadonlyArray<p0>) =>
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
  readonly fromJson: (_a: a.StructuredJsonValue) => FunctionDetail;
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
  readonly fromJson: (_a: a.StructuredJsonValue) => Type;
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
 * サーバー名の取得
 */
export const name = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = definyRpcServerPathPrefixAsString + "/definyRpc/name";
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
  readonly origin?: string | undefined;
}): globalThis.Promise<
  Result<globalThis.ReadonlySet<globalThis.ReadonlyArray<string>>, "error">
> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname = definyRpcServerPathPrefixAsString + "/definyRpc/namespaceList";
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
  readonly origin?: string | undefined;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<FunctionDetail>, "error">
> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname =
    definyRpcServerPathPrefixAsString + "/definyRpc/functionListByName";
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
  readonly origin?: string | undefined;
  readonly accountToken: AccountToken;
}): globalThis.Promise<
  Result<globalThis.ReadonlyArray<FunctionDetail>, "error">
> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname =
    definyRpcServerPathPrefixAsString + "/definyRpc/functionListByNamePrivate";
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
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname =
    definyRpcServerPathPrefixAsString +
    "/definyRpc/generateCallDefinyRpcTypeScriptCode";
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
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する
 */
export const generateCodeAndWriteAsFileInServer = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly origin?: string | undefined;
}): globalThis.Promise<Result<undefined, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.origin ?? "http://localhost:2520"
  );
  url.pathname =
    definyRpcServerPathPrefixAsString +
    "/definyRpc/generateCodeAndWriteAsFileInServer";
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

/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/61351534fba3e0549319fe11feee7c3dc823d7c1/deno-lib/typedJson.ts";

/**
 * 取得した結果
 */
export type Result<ok extends unknown, error extends unknown> =
  | { readonly type: "ok"; readonly ok: ok }
  | { readonly type: "error"; readonly error: error };

/**
 * ログインコールバック時にURLにつけられる code と state
 */
export type CodeAndState = {
  /**
   * 毎回発行されるキー. Google から情報を得るために必要
   */
  readonly code: string;
  /**
   * このサーバーが発行したものか判別するためのキー
   */
  readonly state: string;
  readonly [globalThis.Symbol.toStringTag]: "definyApi.CodeAndState";
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
  readonly fromStructuredJsonValue: (a: a.StructuredJsonValue) => undefined;
} = {
  description: "内部表現は, undefined. JSON 上では null",
  fromStructuredJsonValue: (jsonValue: a.StructuredJsonValue): undefined =>
    undefined,
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
 * ログインコールバック時にURLにつけられる code と state
 */
export const CodeAndState: {
  /**
   * CodeAndState の説明文
   */
  readonly description: string;
  /**
   * オブジェクトから作成する. 余計なフィールドがレスポンスに含まれてしまうのを防ぐ. 型のチェックはしない
   */
  readonly from: (
    a: globalThis.Omit<CodeAndState, typeof globalThis.Symbol.toStringTag>,
  ) => CodeAndState;
  /**
   * JsonからCodeAndStateに変換する. 失敗した場合はエラー
   */
  readonly fromStructuredJsonValue: (a: a.StructuredJsonValue) => CodeAndState;
} = {
  description: "ログインコールバック時にURLにつけられる code と state",
  from: (
    obj: globalThis.Omit<CodeAndState, typeof globalThis.Symbol.toStringTag>,
  ): CodeAndState => ({
    code: obj.code,
    state: obj.state,
    [globalThis.Symbol.toStringTag]: "definyApi.CodeAndState",
  }),
  fromStructuredJsonValue: (jsonValue: a.StructuredJsonValue): CodeAndState => {
    if (jsonValue.type !== "object") {
      throw new Error(
        "expected object in CodeAndState.fromStructuredJsonValue",
      );
    }
    const code: a.StructuredJsonValue | undefined = jsonValue.value.get("code");
    if (code === undefined) {
      throw new Error(
        "expected code field. in CodeAndState.fromStructuredJsonValue",
      );
    }
    const state: a.StructuredJsonValue | undefined = jsonValue.value.get(
      "state",
    );
    if (state === undefined) {
      throw new Error(
        "expected state field. in CodeAndState.fromStructuredJsonValue",
      );
    }
    return CodeAndState.from({
      code: String.fromStructuredJsonValue(code),
      state: String.fromStructuredJsonValue(state),
    });
  },
};

/**
 * hello と挨拶が返ってくる
 */
export const hello = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/hello";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * 現在時刻を文字列で返す
 */
export const now = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/now";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * "ok"を指定した回数分繰り返して返す
 */
export const repeat = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
  readonly input: number;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/repeat";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * Google でログインするためのURLを発行し取得する
 */
export const createGoogleLogInUrl = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/createGoogleLogInUrl";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * logInCallback にやってきたときにパラメーターから得ることができる code と state を使ってログインする
 */
export const logInByCodeAndState = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
  readonly input: CodeAndState;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/logInByCodeAndState";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};

/**
 * fauna からデータを取得する
 */
export const getDataFromDatabase = (parameter: {
  /**
   * api end point
   * @default http://localhost:2528
   */
  readonly url?: string | undefined;
}): globalThis.Promise<Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2528",
  );
  url.pathname = url.pathname + "/api/definyApi/getDataFromDatabase";
  return globalThis
    .fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<a.RawJsonValue> =>
        response.json(),
    )
    .then(
      (jsonValue: a.RawJsonValue): Result<string, "error"> => ({
        type: "ok",
        ok: String.fromStructuredJsonValue(
          a.rawJsonToStructuredJsonValue(jsonValue),
        ),
      }),
    )
    .catch((): Result<string, "error"> => ({ type: "error", error: "error" }));
};
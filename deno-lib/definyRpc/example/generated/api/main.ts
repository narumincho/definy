/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/d6d8ab20628f332bb6c07c445d4159d86261eb81/deno-lib/definyRpc/core/maybe.ts";
import * as b from "https://raw.githubusercontent.com/narumincho/definy/d6d8ab20628f332bb6c07c445d4159d86261eb81/deno-lib/typedJson.ts";
import * as c from "https://raw.githubusercontent.com/narumincho/definy/d6d8ab20628f332bb6c07c445d4159d86261eb81/deno-lib/definyRpc/core/coreType.ts";

/**
 * hello と挨拶が返ってくる
 */
export const hello = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<a.Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2520"
  );
  url.pathname = url.pathname + "/api/main/hello";
  return fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<b.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: b.RawJsonValue): a.Result<string, "error"> => ({
        type: "ok",
        ok: c.String.fromStructuredJsonValue(
          b.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): a.Result<string, "error"> => ({ type: "error", error: "error" })
    );
};

/**
 * 現在時刻を文字列で返す
 */
export const now = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
}): globalThis.Promise<a.Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2520"
  );
  url.pathname = url.pathname + "/api/main/now";
  return fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<b.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: b.RawJsonValue): a.Result<string, "error"> => ({
        type: "ok",
        ok: c.String.fromStructuredJsonValue(
          b.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): a.Result<string, "error"> => ({ type: "error", error: "error" })
    );
};

/**
 * "ok"を指定した回数分繰り返して返す
 */
export const repeat = (parameter: {
  /**
   * api end point
   * @default http://localhost:2520
   */
  readonly url?: string | undefined;
  readonly input: number;
}): globalThis.Promise<a.Result<string, "error">> => {
  const url: globalThis.URL = new globalThis.URL(
    parameter.url ?? "http://localhost:2520"
  );
  url.pathname = url.pathname + "/api/main/repeat";
  return fetch(url)
    .then(
      (response: globalThis.Response): globalThis.Promise<b.RawJsonValue> =>
        response.json()
    )
    .then(
      (jsonValue: b.RawJsonValue): a.Result<string, "error"> => ({
        type: "ok",
        ok: c.String.fromStructuredJsonValue(
          b.rawJsonToStructuredJsonValue(jsonValue)
        ),
      })
    )
    .catch(
      (): a.Result<string, "error"> => ({ type: "error", error: "error" })
    );
};

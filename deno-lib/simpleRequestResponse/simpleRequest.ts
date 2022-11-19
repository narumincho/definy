import { IncomingMessage } from "../nodeType.ts";

/**
 * 標準の Request オブジェクトから {@link SimpleRequest} を生成します
 */
export const requestObjectToSimpleRequest = (
  request: Request,
): SimpleRequest | undefined => {
  const headers = new Map<string, string>();
  request.headers.forEach((key, value) => {
    headers.set(key, value);
  });

  return commonObjectToSimpleRequest({
    method: request.method,
    headers,
    url: new URL(request.url),
  });
};

export const incomingMessageToSimpleRequest = (
  incomingMessage: IncomingMessage,
): SimpleRequest | undefined => {
  return commonObjectToSimpleRequest({
    method: incomingMessage.method,
    headers: new Map(Object.entries(incomingMessage.headers)),
    url: new URL("https://narumincho.com" + incomingMessage.url),
  });
};

const commonObjectToSimpleRequest = (request: {
  readonly method: string;
  readonly headers: ReadonlyMap<string, string>;
  /**
   * オリジンは無視する. (path と query しか見ない)
   */
  readonly url: URL;
}): SimpleRequest | undefined => {
  if (
    request.method !== "GET" &&
    request.method !== "POST" &&
    request.method !== "OPTIONS"
  ) {
    return undefined;
  }
  const url = new URL(request.url);

  return {
    method: request.method,
    headers: {
      Accept: request.headers.get("Accept"),
      Authorization: request.headers.get("Authorization"),
    },
    path: url.pathname.split("/").filter((item) => item !== ""),
    query: new Map([...url.searchParams]),
  };
};

/**
 * JS標準のRequest よりシンプルで構造化されたリクエスト
 *
 * ヘッダーの部分のみ. Node RED で動かすために body は分ける?
 */
export type SimpleRequest = {
  readonly method: "GET" | "POST" | "OPTIONS";
  readonly path: ReadonlyArray<string>;
  readonly query: ReadonlyMap<string, string>;
  readonly headers: {
    readonly Accept: string | undefined;
    readonly Authorization: string | undefined;
  };
};

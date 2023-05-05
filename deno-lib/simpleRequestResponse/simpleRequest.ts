import { SimpleUrl, urlToSimpleUrl } from "./simpleUrl.ts";

/**
 * 標準の Request オブジェクトから {@link SimpleRequest} を生成します
 * method が PUT などの対応していない場合は `undefined` を返す
 *
 * body を全て読み込むために待っている
 */
export const requestObjectToSimpleRequest = async (
  request: Request,
): Promise<SimpleRequest | undefined> => {
  const headers = new Map<string, string>();
  request.headers.forEach((key, value) => {
    headers.set(key, value);
  });
  if (
    request.method !== "GET" &&
    request.method !== "POST" &&
    request.method !== "OPTIONS"
  ) {
    return undefined;
  }

  if (request.method === "POST") {
    return {
      method: request.method,
      url: urlToSimpleUrl(new URL(request.url)),
      headers: toSimpleRequestHeader(request.headers),
      body: new Uint8Array(await request.arrayBuffer()),
    };
  }

  return {
    method: request.method,
    url: urlToSimpleUrl(new URL(request.url)),
    headers: toSimpleRequestHeader(request.headers),
    body: undefined,
  };
};

const toSimpleRequestHeader = (headers: Headers): SimpleRequestHeader => {
  const [authorizationType, authorizationCredentials] =
    headers.get("Authorization")?.split(" ") ?? [];
  return {
    accept: headers.get("Accept") ?? undefined,
    authorization: authorizationType !== "Bearer" ||
        authorizationCredentials === undefined
      ? undefined
      : {
        type: authorizationType,
        credentials: authorizationCredentials,
      },
  };
};

/**
 * JS標準のRequest よりシンプルで構造化されたリクエスト
 */
export type SimpleRequest = {
  readonly method: "GET" | "OPTIONS";
  readonly url: SimpleUrl;
  readonly headers: SimpleRequestHeader;
  readonly body: undefined;
} | {
  readonly method: "POST";
  readonly url: SimpleUrl;
  readonly headers: SimpleRequestHeader;
  readonly body: Uint8Array;
};

export type SimpleRequestHeader = {
  readonly accept: string | undefined;
  readonly authorization:
    | { readonly type: "Bearer"; readonly credentials: string }
    | undefined;
};

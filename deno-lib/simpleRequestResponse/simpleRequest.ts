import { SimpleUrl, urlToSimpleUrl } from "./simpleUrl.ts";

/**
 * 標準の Request オブジェクトから {@link SimpleRequest} を生成します
 * method が PUT などの対応していない場合は `undefined` を返す
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

  const htmlAccept = request.headers.get("accept")?.includes("text/html") ??
    false;

  if (request.method === "POST") {
    return {
      method: request.method,
      url: urlToSimpleUrl(new URL(request.url)),
      headers: toSimpleRequestHeader(request.headers),
      body: new Uint8Array(await request.arrayBuffer()),
      htmlAccept,
    };
  }

  return {
    method: request.method,
    url: urlToSimpleUrl(new URL(request.url)),
    headers: toSimpleRequestHeader(request.headers),
    body: undefined,
    htmlAccept,
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
  readonly htmlAccept: boolean;
} | {
  readonly method: "POST";
  readonly url: SimpleUrl;
  readonly headers: SimpleRequestHeader;
  readonly body: Uint8Array;
  readonly htmlAccept: boolean;
};

export type SimpleRequestHeader = {
  readonly accept: string | undefined;
  readonly authorization:
    | { readonly type: "Bearer"; readonly credentials: string }
    | undefined;
};

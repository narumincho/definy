import { SimpleUrl, urlToSimpleUrl } from "./simpleUrl.ts";

/**
 * 標準の Request オブジェクトから {@link SimpleRequest} を生成します
 * method が PUT などの対応していない場合は `undefined` を返す
 */
export const requestObjectToSimpleRequest = (
  request: Request,
): SimpleRequest | undefined => {
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
  const [authorizationType, authorizationCredentials] =
    request.headers.get("Authorization")?.split(" ") ?? [];

  return {
    method: request.method,
    url: urlToSimpleUrl(new URL(request.url)),
    headers: {
      accept: request.headers.get("Accept") ?? undefined,
      authorization: authorizationType !== "Bearer" ||
          authorizationCredentials === undefined
        ? undefined
        : {
          type: authorizationType,
          credentials: authorizationCredentials,
        },
      origin: request.headers.get("Origin") ?? undefined,
    },
  };
};

/**
 * JS標準のRequest よりシンプルで構造化されたリクエスト
 */
export type SimpleRequest = {
  readonly method: "GET" | "POST" | "OPTIONS";
  readonly url: SimpleUrl;
  readonly headers: {
    readonly accept: string | undefined;
    readonly authorization:
      | { readonly type: "Bearer"; readonly credentials: string }
      | undefined;
    readonly origin: string | undefined;
  };
};

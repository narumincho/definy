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
  const [authorizationType, authorizationCredentials] =
    request.headers.get("Authorization")?.split(" ") ?? [];

  return {
    method: request.method,
    headers: {
      accept: request.headers.get("Accept"),
      authorization: authorizationType !== "Bearer" ||
          authorizationCredentials === undefined
        ? undefined
        : {
          type: authorizationType,
          credentials: authorizationCredentials,
        },
      origin: request.headers.get("Origin"),
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
    readonly accept: string | undefined;
    readonly authorization:
      | { readonly type: "Bearer"; readonly credentials: string }
      | undefined;
    readonly origin: string | undefined;
  };
};

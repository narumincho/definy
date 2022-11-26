/**
 * Trailing Slash とか気にしなくて良い構造化された読み取り専用の {@link URL}
 */
export type SimpleUrl = {
  readonly origin: string;
  readonly path: ReadonlyArray<string>;
  readonly query: ReadonlyMap<string, string>;
};

export const urlToSimpleUrl = (url: URL): SimpleUrl => {
  return {
    origin: url.origin,
    path: url.pathname.split("/").filter((item) => item !== ""),
    query: new Map([...url.searchParams]),
  };
};

export const simpleUrlToUrlText = (simpleUrl: SimpleUrl): string => {
  const url = new URL(simpleUrl.origin);
  url.pathname = "/" + simpleUrl.path.join("/");
  for (const [queryKey, queryValue] of simpleUrl.query) {
    url.searchParams.set(queryKey, queryValue);
  }
  return url.toString();
};

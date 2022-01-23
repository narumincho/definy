export const searchParamsToString = (
  queryList: ReadonlyArray<{ key: string; value: string }>
): string => {
  return new URLSearchParams(queryList.map((e) => [e.key, e.value])).toString();
};

export const parseNodeHttpUrl = (
  nodeHttpUrl: string
): {
  readonly path: string;
  readonly searchParams: ReadonlyArray<{ key: string; value: string }>;
} => {
  const url = new URL("https://example.com/" + nodeHttpUrl);
  return {
    path: url.pathname,
    searchParams: [...url.searchParams].map((keyAndValue) => ({
      key: keyAndValue[0],
      value: keyAndValue[1],
    })),
  };
};

export const parseSearchParams = (
  searchParams: string
): ReadonlyArray<{ key: string; value: string }> => {
  return [...new URLSearchParams(searchParams)].map((keyAndValue) => ({
    key: keyAndValue[0],
    value: keyAndValue[1],
  }));
};

export const searchParamsToString = (
  queryList: ReadonlyArray<{ key: string; value: string }>
): string => {
  return new URLSearchParams(queryList.map((e) => [e.key, e.value])).toString();
};

/**
 * リストに区切りの要素を追加する
 */
export const listAddSeparator = <Element>(
  list: ReadonlyArray<Element>,
  separator: Element
): ReadonlyArray<Element> => {
  const first = list[0];
  if (first === undefined) {
    return [];
  }
  return [
    first,
    ...list
      .slice(1)
      .flatMap((element): ReadonlyArray<Element> => [separator, element]),
  ];
};

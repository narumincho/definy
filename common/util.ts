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

/**
 * `undefined` かもしれない値に関数を呼ぶ
 */
export const maybeMap = <Input, Output>(
  value: Input | undefined,
  func: (input: Input) => Output
): Output | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return func(value);
};

export const listDeleteAt = <Element>(
  list: ReadonlyArray<Element>,
  index: number
): ReadonlyArray<Element> => {
  return [
    ...list.slice(0, Math.max(0, index)),
    ...list.slice(Math.max(0, index + 1)),
  ];
};

export const listUpdateAt = <Element>(
  list: ReadonlyArray<Element>,
  index: number,
  func: (e: Element) => Element
): ReadonlyArray<Element> => {
  const element = list[index];
  if (element === undefined) {
    return list;
  }
  return [
    ...list.slice(0, Math.max(0, index)),
    func(element),
    ...list.slice(Math.max(0, index + 1)),
  ];
};

export const listSetAt = <Element>(
  list: ReadonlyArray<Element>,
  index: number,
  newElement: Element
): ReadonlyArray<Element> => {
  if (index < 0 || list.length <= index) {
    return list;
  }
  return [
    ...list.slice(0, Math.max(0, index)),
    newElement,
    ...list.slice(Math.max(0, index + 1)),
  ];
};

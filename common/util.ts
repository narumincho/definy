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

/**
 * 指定したインデックスの要素を削除した配列を生成する
 * @example
 * listDeleteAt(["a", "b", "c", "d"], 2) // ["a", "b", "d"]
 */
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

export const listUpdateAtOverAutoCreate = <Element>(
  list: ReadonlyArray<Element>,
  index: number,
  func: (e: Element | undefined) => Element,
  fillElement: Element
): ReadonlyArray<Element> => {
  const element = list[index];
  if (element === undefined) {
    if (list.length <= index) {
      return [
        ...list,
        ...new Array(index - list.length).fill(fillElement),
        func(undefined),
      ];
    }
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

export const neverFunc = (): never => {
  throw new Error("呼ばれないはずの関数. neverFunc が呼ばれた!");
};

/**
 * 配列をグループ分けする
 * https://qiita.com/nagtkk/items/e1cc3f929b61b1882bd1
 * @param list グループ分けする配列
 * @param groupIndexFunc グループ番号(外側の配列のインデックス)を返す関数
 *
 * @example
 * scatter(["a", "bb", "c", "ddd"], (text)=>text.length) // [[],["a", "c"], ["bb"], ["ddd"]]
 */
export const group = <T>(
  list: ReadonlyArray<T>,
  groupIndexFunc: (element: T, index: number) => number
): ReadonlyArray<ReadonlyArray<T>> =>
  list.reduce<ReadonlyArray<ReadonlyArray<T>>>(
    (result, cur, index): ReadonlyArray<ReadonlyArray<T>> => {
      return listUpdateAtOverAutoCreate<ReadonlyArray<T>>(
        result,
        groupIndexFunc(cur, index),
        (item) => [...(item ?? []), cur],
        []
      );
    },
    []
  );

export const groupBySize = <T>(
  list: ReadonlyArray<T>,
  size: number
): ReadonlyArray<ReadonlyArray<T>> => {
  if (size < 0) {
    throw new Error("size need +");
  }
  return group(list, (_, i) => Math.floor(i / Math.floor(size)));
};

/**
 * ランダムな ID の文字列を生成する
 * [crypto.getRandomValues()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) を使っているので, ブラウザでのみ動く
 * @returns
 */
export const createRandomId = (): string => {
  const binary = crypto.getRandomValues(new Uint8Array(32));
  let result = "";
  for (const item of binary) {
    result += item.toString(16).padStart(2, "0");
  }
  return result;
};

export const firstLowerCase = (text: string): string =>
  text.substring(0, 1).toLowerCase() + text.substring(1);

export type NonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>];

export const nonEmptyArrayMap = <Input, Output>(
  list: NonEmptyArray<Input>,
  func: (input: Input) => Output
): NonEmptyArray<Output> => {
  const [head, ...tail] = list;
  return [func(head), ...tail.map(func)];
};

export const getLast = <T>(list: NonEmptyArray<T>): T => {
  const item = list[list.length - 1];
  return item ?? list[0];
};

export const arrayFromLength = <T>(
  length: number,
  func: (index: number) => T
): ReadonlyArray<T> => {
  return Array.from({ length }, (_, i) => func(i));
};

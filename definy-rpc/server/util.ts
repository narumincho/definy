export type NonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>];

export const nonEmptyArrayMap = <Input, Output>(
  list: NonEmptyArray<Input>,
  func: (input: Input) => Output
): NonEmptyArray<Output> => {
  const [head, ...tail] = list;
  return [func(head), ...tail.map(func)];
};

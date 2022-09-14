/**
 * 余計なフィールドを含んでない前提での {@link Object.entries}
 * @param parameter
 * @returns
 */
export const objectEntriesSameValue = <t extends Record<string, unknown>>(
  parameter: t
): ReadonlyArray<ValueOf<{ [key in keyof t]: [key, t[key]] }>> => {
  return Object.entries(parameter) as ReadonlyArray<
    ValueOf<{ [key in keyof t]: [key, t[key]] }>
  >;
};

export type ValueOf<t> = t[keyof t];

const _v: ReadonlyArray<["a", 32] | ["b", "sorena"]> = objectEntriesSameValue({
  a: 32,
  b: "sorena",
} as const);

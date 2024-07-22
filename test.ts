import { assertEquals } from "jsr:@std/assert";

// const diff = <T>(
//   oldList: ReadonlyArray<T>,
//   newList: ReadonlyArray<T>,
//   diffPointFunc: (
//     o: T | undefined,
//     n: T | undefined,
//   ) => ReadonlyMap<string, number>,
// ): ReadonlyArray<string> => {
// };

// const stringDiffPointFunc = (
//   o: string | undefined,
//   n: string | undefined,
// ): ReadonlyMap<string, number> => {
//   if (o === undefined) {
//     if (n === undefined) {
//       return new Map([["そのまま", 0]]);
//     } else {
//       return new Map([["追加", 1]]);
//     }
//   } else {
//     if (n === undefined) {
//       return new Map([["削除", 1]]);
//     } else {
//       if (o === n) {
//         return new Map([""]);
//       }
//     }
//   }
// };

type Operation = { readonly type: "insert"; readonly char: string } | {
  readonly type: "delete";
  readonly char: string;
} | {
  readonly type: "none";
  readonly char: string;
} | {
  readonly type: "replace";
  readonly from: string;
  readonly to: string;
};

type PointAndOperation = {
  readonly point: number;
  readonly operationList: ReadonlyArray<Operation>;
};

/**
 * Mapから最小の値を探す
 */
const getMinValue = <T>(
  array: ReadonlyArray<T>,
  getNumber: (t: T) => number,
): T | undefined => {
  let current: T | undefined = undefined;
  for (const value of array) {
    if (current === undefined || getNumber(value) < getNumber(current)) {
      current = value;
    }
  }
  return current;
};

Deno.test("diff", () => {
  const oldList = "apple";
  const newList = "kaggleo";

  const table = Array.from(
    { length: newList.length + 1 },
    () =>
      Array.from({ length: oldList.length + 1 }, (): PointAndOperation => ({
        point: 0,
        operationList: [],
      })),
  );
  for (let n = 0; n < newList.length + 1; n++) {
    for (let o = 0; o < oldList.length + 1; o++) {
      if (n === 0 && o === 0) {
        continue;
      }
      const top = table[n - 1]?.[o];
      const left = table[n]?.[o - 1];
      const leftTop = table[n - 1]?.[o - 1];
      // const leftTopPoint = leftTop
      //   ? leftTop.point +
      //     (oldList[o - 1] === newList[n - 1] ? 0 : 1)
      //   : undefined;
      const oldChar = oldList[o - 1];
      const newChar = newList[n - 1];
      const isSame = newChar === oldChar;
      table[n]![o] = getMinValue<
        PointAndOperation
      >([
        ...(top
          ? [{
            point: top.point + 1,
            operationList: [...top.operationList, {
              type: "insert",
              char: newChar ?? "???",
            }],
          }] as const
          : []),
        ...(left
          ? [{
            point: left.point + 1,
            operationList: [...left.operationList, {
              type: "delete",
              char: oldChar ?? "???",
            }],
          }] as const
          : []),
        ...(leftTop
          ? [{
            point: leftTop.point + (isSame ? 0 : 3),
            operationList: [
              ...leftTop.operationList,
              isSame
                ? {
                  type: "none",
                  char: newChar ?? "???",
                } as const
                : {
                  type: "replace",
                  from: oldChar ?? "???",
                  to: newChar ?? "???",
                } as const,
            ],
          }]
          : []),
      ], (t) => t.point)!;
    }
  }
  console.log(table.map((r) => r.map((c) => c.point)));
  console.log(table[table.length - 1]![table[0]!.length - 1]);
});

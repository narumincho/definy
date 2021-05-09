import { uInt32ToBinary } from "./value";

/**
 * よく使われる要素数と中身
 */
export const vectorToWasmBinary = (
  binaryList: ReadonlyArray<ReadonlyArray<number>>
): ReadonlyArray<number> => {
  return [...uInt32ToBinary(binaryList.length), ...binaryList.flat()];
};

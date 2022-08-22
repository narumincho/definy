import { randomUUID } from "node:crypto";

/**
 * ランダムな ID の文字列を生成する. Node でのみ動作する
 * @example "106d592c477e44a996a2844a98ad9c60"
 */
export const createRandomUuid = (): string => {
  return randomUUID().replaceAll("-", "");
};

/**
 * ランダムな ID の文字列を生成する. Node でのみ動作する
 * @example "d93f1010a9ac4718b52eac4ed64c31e46c12b607afcc4a81a2789161b8e73ba0"
 */
export const createRandomToken = (): string => {
  return createRandomUuid() + createRandomUuid();
};

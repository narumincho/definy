/**
 * deno 版 definy ではまだ型パラメータをサポートしてないので, 直接書いたこの型を使う
 */

export type Maybe<T extends unknown> = {
  readonly type: "just";
  readonly value: T;
} | {
  readonly type: "nothing";
};

export type Result<Ok extends unknown, Error extends unknown> = {
  readonly type: "ok";
  readonly value: Ok;
} | {
  readonly type: "error";
  readonly value: Error;
};

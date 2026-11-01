import { describe, expect, it } from "vitest";
import { decodeCborItem, encodeCborItem } from "./cbor.ts";

describe("encodeCborItem", () => {
  it("2^32 以上の整数を 8 バイトの引数で書き, 読み戻せる", () => {
    for (const value of [0xffffffff, 2 ** 32, 2 ** 52 - 1, -(2 ** 40)]) {
      expect(decodeCborItem(encodeCborItem(value))[0]).toBe(value);
    }
    expect([...encodeCborItem(2 ** 32)]).toEqual([
      0x1b, 0, 0, 0, 1, 0, 0, 0, 0,
    ]);
  });
});

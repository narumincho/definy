import { describe, expect, it } from "vitest";
import {
  list,
  number,
  record,
  selfHostedList,
  selfHostedNumber,
  selfHostedRecord,
  selfHostedString,
  selfHostedVariant,
  string,
  variant,
} from "./self_hosted_ast.ts";

describe("self_hosted_ast helpers", () => {
  it("variant with payload", () => {
    expect(selfHostedVariant("some", 42)).toEqual({
      Variant: { tag: "some", payload: 42 },
    });
    expect(variant("some", 42)).toEqual({
      Variant: { tag: "some", payload: 42 },
    });
  });

  it("variant without payload", () => {
    expect(selfHostedVariant("none")).toEqual({
      Variant: { tag: "none" },
    });
    expect(variant("none")).toEqual({
      Variant: { tag: "none" },
    });
  });

  it("record creates TypeLiteral items", () => {
    const input: ReadonlyArray<readonly [string, unknown]> = [
      ["a", 1],
      ["b", "hello"],
    ];
    const expected = {
      TypeLiteral: {
        items: [
          { key: "a", value: 1 },
          { key: "b", value: "hello" },
        ],
      },
    };
    expect(selfHostedRecord(input)).toEqual(expected);
    expect(record(input)).toEqual(expected);
  });

  it("list creates ListLiteral", () => {
    const input: ReadonlyArray<unknown> = [1, 2, 3];
    expect(selfHostedList(input)).toEqual({
      ListLiteral: { items: [1, 2, 3] },
    });
    expect(list(input)).toEqual({ ListLiteral: { items: [1, 2, 3] } });
  });

  it("number creates Number node", () => {
    expect(selfHostedNumber(123)).toEqual({ Number: { value: 123 } });
    expect(number(123)).toEqual({ Number: { value: 123 } });
  });

  it("string creates String node", () => {
    expect(selfHostedString("xyz")).toEqual({ String: { value: "xyz" } });
    expect(string("xyz")).toEqual({ String: { value: "xyz" } });
  });
});

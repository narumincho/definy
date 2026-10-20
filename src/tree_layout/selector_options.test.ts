import { describe, expect, it } from "vitest";
import {
  buildSelectorOptions,
  filterAndRankOptions,
  resolveCurrentOptionValue,
  resolveHighlight,
  type SelectorOption,
} from "./selector_options.ts";

function option(
  value: string,
  name: string,
  returnType: SelectorOption["returnType"] = "any",
): SelectorOption {
  return { value, name, category: "Part", returnType };
}

const options: ReadonlyArray<SelectorOption> = [
  option("ref:part:a", "std.string-index-of", "number"),
  option("ref:part:b", "core.list"),
  { ...option("ref:local:2", "index"), detail: "#2", category: "Local" },
  option("ref:part:c", "std.index-of-x", "number"),
  { ...option("ref:part:d", "other", "number"), detail: "index" },
];

describe("filterAndRankOptions", () => {
  it("名前の一致, 前方一致, 部分一致, 補足の一致の順に並べる", () => {
    expect(
      filterAndRankOptions(options, "index", "any").map((o) => o.value),
    ).toEqual(["ref:local:2", "ref:part:c", "ref:part:a", "ref:part:d"]);
  });

  it("module. を除いた名前でも前方一致とみなす", () => {
    expect(
      filterAndRankOptions(options, "list", "any").map((o) => o.value),
    ).toEqual(["ref:part:b"]);
  });

  it("期待型に合わない選択肢は一致度に関わらず後ろにまとめる", () => {
    expect(
      filterAndRankOptions(options, "index", "string").map((o) => o.value),
    ).toEqual(["ref:local:2", "ref:part:c", "ref:part:a", "ref:part:d"]);
    expect(
      filterAndRankOptions(options, "", "string").map((o) => o.value),
    ).toEqual([
      "ref:part:b",
      "ref:local:2",
      "ref:part:a",
      "ref:part:c",
      "ref:part:d",
    ]);
  });

  it("検索語が空なら元の順序のまま", () => {
    expect(filterAndRankOptions(options, "  ", "any")).toEqual(options);
  });
});

describe("resolveHighlight", () => {
  it("開いた直後は現在値を示すだけ (Enter で適用しない)", () => {
    expect(resolveHighlight(null, options, "ref:part:b")).toEqual({
      kind: "implicit",
      index: 1,
    });
  });

  it("現在値が選択肢になければ何もハイライトしない", () => {
    expect(resolveHighlight(null, options, "expr:other")).toEqual({
      kind: "none",
    });
  });

  it("矢印キーや検索で選んだ選択肢は chosen になる", () => {
    expect(resolveHighlight(2, options, "ref:part:b")).toEqual({
      kind: "chosen",
      index: 2,
    });
    // 絞り込みで範囲外になったら選び直しとみなさない
    expect(resolveHighlight(9, options, "ref:part:b")).toEqual({
      kind: "implicit",
      index: 1,
    });
  });
});

describe("buildSelectorOptions and resolveCurrentOptionValue", () => {
  it("builds type options in type mode", () => {
    const opts = buildSelectorOptions({
      mode: "type",
      partOptions: [option("ref:part:type1", "my.type")],
    });
    expect(opts.some((o) => o.value === "expr:type:number")).toBe(true);
    expect(opts.some((o) => o.value === "ref:part:type1")).toBe(true);
  });

  it("builds expression options with variables in expression mode", () => {
    const opts = buildSelectorOptions({
      mode: "expression",
      scopeVariables: new Map([[1, "myVar"]]),
      partOptions: [option("ref:part:fn1", "my.func")],
    });
    expect(opts.some((o) => o.value === "ref:local:1")).toBe(true);
    expect(opts.some((o) => o.value === "expr:number")).toBe(true);
    expect(opts.some((o) => o.value === "ref:part:fn1")).toBe(true);
  });

  it("resolves current option value for literals and types", () => {
    const val = resolveCurrentOptionValue({
      expression: { Number: { value: 42 } },
      path: [],
      options: [option("expr:number", "number")],
      mode: "expression",
      partNames: new Map(),
    });
    expect(val).toBe("expr:number");
  });
});

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { createStage1Compiler } from "./stage1_compiler.ts";
import { formatRunValue, runExpression } from "./run_expression.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(fs.readFileSync("wasm/stage1.wasm")),
);

const wasiIoHost = {
  handle: () => Promise.resolve({ error: "no network in tests" }),
  getSecret: () => undefined,
};

function call(partId: string, args: Readonly<Record<string, unknown>>) {
  return {
    "#call": {
      function: { "#part_reference": { part_definition_event_hash: partId } },
      arguments: Object.entries(args).map(([name, value]) => ({ name, value })),
    },
  };
}

describe("runExpression", () => {
  it("参照しているパーツの式を集めて実行する", async () => {
    const outcome = await runExpression(
      call("plus", { left: { "#number": 15 }, right: { "#number": 27 } }),
      {
        compiler,
        resolvePart: (id) =>
          id === "plus" ? { "#builtin": "plus" } : undefined,
        wasiIoHost,
      },
    );
    expect(outcome).toEqual({ kind: "value", value: 42, wasiIo: null });
  });

  it("見つからないパーツがあれば実行しない", async () => {
    const outcome = await runExpression(
      call("missing", { x: { "#number": 1 } }),
      { compiler, resolvePart: () => undefined, wasiIoHost },
    );
    expect(outcome).toEqual({ kind: "unresolved_parts", partIds: ["missing"] });
  });

  it("wasi.io の値なら done まで動かす", async () => {
    const outcome = await runExpression(
      {
        "#variant": {
          tag: "done",
          payload: { "#some": { "#string": "ok" } },
          type_part: { "#none": null },
        },
      },
      { compiler, resolvePart: () => undefined, wasiIoHost },
    );
    expect(outcome).toMatchObject({
      kind: "value",
      wasiIo: { steps: [], message: "ok" },
    });
  });

  it("未入力があればエラーにする", async () => {
    const outcome = await runExpression(
      { "#hole": { probe: false } },
      { compiler, resolvePart: () => undefined, wasiIoHost },
    );
    expect(outcome.kind).toBe("error");
  });
});

describe("formatRunValue", () => {
  it("レコードは整形した JSON にする", () => {
    expect(formatRunValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatRunValue(null)).toBe("null");
    expect(formatRunValue("x")).toBe("x");
  });
});

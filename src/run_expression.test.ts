import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { createStage1Compiler } from "./stage1_compiler.ts";
import {
  formatRunValue,
  runExpression,
  runValueExpression,
} from "./run_expression.ts";

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

describe("runValueExpression", () => {
  const noType = { type: null, floatNanPartId: undefined };

  it("数値・文字列・真偽値はリテラルの式になる", () => {
    expect(runValueExpression(25, noType)).toEqual({ "#number": 25 });
    expect(runValueExpression(1.5, noType)).toEqual({
      "#float": { mantissa: 15, exponent: -1 },
    });
    expect(runValueExpression("a", noType)).toEqual({ "#string": "a" });
    expect(runValueExpression(true, noType)).toEqual({ "#boolean": true });
  });

  it("リスト・レコード・タグ付きの値は中身ごと式になる", () => {
    expect(
      runValueExpression(
        [{ name: "x", value: { "#some": 1 } }, { "#none": null }] as never,
        noType,
      ),
    ).toEqual({
      "#list": [
        {
          "#record": [
            { key: "name", value: { "#string": "x" } },
            {
              key: "value",
              value: {
                "#variant": {
                  tag: "some",
                  payload: { "#some": { "#number": 1 } },
                  type_part: { "#none": null },
                },
              },
            },
          ],
        },
        {
          "#variant": {
            tag: "none",
            payload: { "#none": null },
            type_part: { "#none": null },
          },
        },
      ],
    });
  });

  it("式で書けない値を含むときは null", () => {
    expect(
      runValueExpression(
        [1, { __closure: true, tableIdx: 0, envPtr: 0 }] as never,
        noType,
      ),
    ).toBeNull();
    expect(runValueExpression(null, noType)).toBeNull();
    expect(runValueExpression(Number.POSITIVE_INFINITY, noType)).toBeNull();
    // core.float-nan が無ければ NaN も書けない
    expect(runValueExpression(Number.NaN, noType)).toBeNull();
  });

  it("NaN は core.float-nan の参照になる", () => {
    expect(
      runValueExpression([Number.NaN], {
        type: null,
        floatNanPartId: "nan-id",
      }),
    ).toEqual({
      "#list": [
        { "#part_reference": { part_definition_event_hash: "nan-id" } },
      ],
    });
  });

  it("型が float の数は整数の値でも浮動小数のリテラルにする", () => {
    const float = { "#float": null };
    expect(
      runValueExpression(2, { type: float, floatNanPartId: undefined }),
    ).toEqual({ "#float": { mantissa: 2, exponent: 0 } });
    expect(
      runValueExpression([2], {
        type: { "#list": { item_type: float } },
        floatNanPartId: undefined,
      }),
    ).toEqual({ "#list": [{ "#float": { mantissa: 2, exponent: 0 } }] });
    expect(
      runValueExpression({ x: 2, n: 2 } as never, {
        type: {
          "#record": [
            { key: "x", field_type: float },
            { key: "n", field_type: { "#number": null } },
          ],
        },
        floatNanPartId: undefined,
      }),
    ).toEqual({
      "#record": [
        { key: "x", value: { "#float": { mantissa: 2, exponent: 0 } } },
        { key: "n", value: { "#number": 2 } },
      ],
    });
  });
});

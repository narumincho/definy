import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
  SelfHostedAstConversionError,
} from "./stage1_compiler.ts";

/** テスト用のコンパイラ組み込みのパーツ. ID は組み込みの名前にする */
const builtinParts = [
  "plus",
  "minus",
  "multiply",
  "divide",
  "less_than_or_equal",
].map((name) => ({ id: name, expression: { "#builtin": name } }));

/** テスト用の `apply(f, x) = f(x: x)`. 関数の引数にはラムダ式を書く */
const applyPart = {
  id: "apply",
  expression: {
    "#function": {
      parameters: [
        { parameter_id: 100, parameter_name: "f" },
        { parameter_id: 101, parameter_name: "x" },
      ],
      body: {
        "#call": {
          function: { "#variable": { variable_id: 100 } },
          arguments: [
            { name: "x", value: { "#variable": { variable_id: 101 } } },
          ],
        },
      },
    },
  },
};

/** コンパイラ組み込みのパーツ (ID は {@link builtinParts}) の呼び出し */
function builtinCall(
  name: string,
  args: Readonly<Record<string, unknown>>,
): unknown {
  return {
    "#call": {
      function: { "#part_reference": { part_definition_event_hash: name } },
      arguments: Object.entries(args).map(([argName, value]) => ({
        name: argName,
        value,
      })),
    },
  };
}

describe("stage1 compiler in pure TypeScript / WebAssembly", () => {
  it("compiles and evaluates number literal (42)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const stage1Module = new WebAssembly.Module(wasmBytes);
    const compiler = createStage1Compiler(stage1Module);

    const ast = { "#number": 42 };

    const compiledWasm = compiler.compile(ast);
    expect(compiledWasm[0]).toBe(0x00);
    expect(compiledWasm[1]).toBe(0x61);
    expect(compiledWasm[2]).toBe(0x73);
    expect(compiledWasm[3]).toBe(0x6d);

    const evaluated = await evaluateCompiledWasm(compiledWasm);
    expect(evaluated).toBe(42);
  });

  it("compiles and evaluates addition (15 + 27 = 42)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const stage1Module = new WebAssembly.Module(wasmBytes);
    const compiler = createStage1Compiler(stage1Module);

    const ast = builtinCall("plus", {
      left: { "#number": 15 },
      right: { "#number": 27 },
    });

    const compiledWasm = compiler.compile(ast, builtinParts);
    const evaluated = await evaluateCompiledWasm(compiledWasm);
    expect(evaluated).toBe(42);
  });

  it("compiles a call to a compiler built-in whose arguments are in another order", async () => {
    const compiler = createStage1Compiler(
      new WebAssembly.Module(fs.readFileSync("wasm/stage1.wasm")),
    );
    /** `apply(f: (x) => x * factor, x: value)`. 引数に関数を入れて, 関数の番号の数え方を確かめる */
    const scaled = (id: number, factor: number, value: number): unknown =>
      builtinCall("apply", {
        f: {
          "#function": {
            parameters: [{ parameter_id: id, parameter_name: "x" }],
            body: builtinCall("multiply", {
              left: { "#variable": { variable_id: id } },
              right: { "#number": factor },
            }),
          },
        },
        x: { "#number": value },
      });
    // minus(right: 1 * 3, left: 5 * 10) = 50 - 3
    const ast = builtinCall("minus", {
      right: scaled(1, 3, 1),
      left: scaled(2, 10, 5),
    });
    expect(
      await evaluateCompiledWasm(
        compiler.compile(ast, [...builtinParts, applyPart]),
      ),
    ).toBe(47);
  });

  it("compiles and evaluates let (triangle area (10 * 5) / 2 = 25)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const stage1Module = new WebAssembly.Module(wasmBytes);
    const compiler = createStage1Compiler(stage1Module);

    // let base = 10 in let height = 5 in (base * height) / 2
    const triangleAst = {
      "#let": {
        variable_id: 1,
        variable_name: "base",
        value: { "#number": 10 },
        body: {
          "#let": {
            variable_id: 2,
            variable_name: "height",
            value: { "#number": 5 },
            body: builtinCall("divide", {
              left: builtinCall("multiply", {
                left: { "#variable": { variable_id: 1 } },
                right: { "#variable": { variable_id: 2 } },
              }),
              right: { "#number": 2 },
            }),
          },
        },
      },
    };

    const compiledWasm = compiler.compile(triangleAst, builtinParts);
    expect(compiledWasm[0]).toBe(0x00);
    expect(compiledWasm[1]).toBe(0x61);
    expect(compiledWasm[2]).toBe(0x73);
    expect(compiledWasm[3]).toBe(0x6d);

    const evaluated = await evaluateCompiledWasm(compiledWasm);
    expect(evaluated).toBe(25);
  });

  it("compiles and evaluates a call to a referenced part (call + part_reference)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));

    // パーツ ID は URL-safe Base64 の文字列
    const doubleId = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
    const offsetId = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc";
    const partExpressions = new Map<string, unknown>([
      [
        // double(x) = x * 2 + offset
        doubleId,
        {
          "#function": {
            parameters: [{ parameter_id: 1, parameter_name: "x" }],
            body: builtinCall("plus", {
              left: builtinCall("multiply", {
                left: { "#variable": { variable_id: 1 } },
                right: { "#number": 2 },
              }),
              right: {
                "#part_reference": { part_definition_event_hash: offsetId },
              },
            }),
          },
        },
      ],
      // offset = 2
      [offsetId, { "#number": 2 }],
      ...builtinParts.map((part) => [part.id, part.expression] as const),
    ]);
    const expression = {
      "#call": {
        function: {
          "#part_reference": { part_definition_event_hash: doubleId },
        },
        arguments: [{ name: "x", value: { "#number": 20 } }],
      },
    };

    const { parts, unresolved } = collectReferencedParts(expression, (id) =>
      partExpressions.get(id),
    );
    // コンパイラ組み込みのパーツも他のパーツと同じ順 (後に現れた参照から) で入る
    expect(parts.map((part) => part.id)).toEqual([
      doubleId,
      offsetId,
      "multiply",
      "plus",
    ]);
    expect(unresolved).toEqual([]);

    const compiledWasm = compiler.compile(expression, parts);
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(42);
  });

  it("reports parts that cannot be passed to stage1 as unresolved", () => {
    const reference = (id: string) => ({
      "#part_reference": { part_definition_event_hash: id },
    });
    const expression = builtinCall("plus", {
      left: reference("missing"),
      right: builtinCall("plus", {
        left: reference("type"),
        right: builtinCall("plus", {
          left: reference("unfinished"),
          right: reference("builtin"),
        }),
      }),
    });
    const { parts, unresolved } = collectReferencedParts(expression, (id) => {
      switch (id) {
        case "builtin":
        case "plus":
          return { "#builtin": id };
        // 未入力のある式は stage1 に渡さない. 型パーツは宣言式のまま渡す (実行時には参照の値になる)
        case "type":
          return { "#type_number": null };
        case "unfinished":
          return { "#hole": { probe: false } };
      }
      return undefined;
    });
    // コンパイラ組み込みのパーツは呼び出さずに参照していても渡す. 後に現れた参照から調べる (LIFO)
    expect(parts).toEqual([
      { id: "builtin", expression: { "#builtin": "builtin" } },
      { id: "plus", expression: { "#builtin": "plus" } },
      { id: "type", expression: { "#type_number": null } },
    ]);
    expect(unresolved).toEqual(["unfinished", "missing"]);
  });

  it("未入力のある式はコンパイルしない", () => {
    const compiler = createStage1Compiler(
      new WebAssembly.Module(fs.readFileSync("wasm/stage1.wasm")),
    );
    expect(() =>
      compiler.compile(
        builtinCall("plus", {
          left: { "#number": 1 },
          right: { "#hole": { probe: false } },
        }),
        builtinParts,
      ),
    ).toThrow(SelfHostedAstConversionError);
  });

  it("compiles tail calls to return_call_indirect so that deep tail recursion does not overflow the stack", async () => {
    const compiler = createStage1Compiler(
      new WebAssembly.Module(fs.readFileSync("wasm/stage1.wasm")),
    );
    const variable = (id: number) => ({ "#variable": { variable_id: id } });
    const callLoop = (n: unknown, acc: unknown) => ({
      "#call": {
        function: { "#part_reference": { part_definition_event_hash: "loop" } },
        arguments: [
          { name: "n", value: n },
          { name: "acc", value: acc },
        ],
      },
    });
    // loop(n, acc) = n <= 0 ? acc : loop(n - 1, acc + 2). 呼び出しは match のアームの中の末尾位置
    const loop = {
      "#function": {
        parameters: [
          { parameter_id: 0, parameter_name: "n" },
          { parameter_id: 1, parameter_name: "acc" },
        ],
        body: {
          "#match": {
            target: builtinCall("less_than_or_equal", {
              left: variable(0),
              right: { "#number": 0 },
            }),
            arms: [
              {
                pattern: { "#boolean": true },
                body: variable(1),
              },
              {
                pattern: { "#boolean": false },
                body: callLoop(
                  builtinCall("minus", {
                    left: variable(0),
                    right: { "#number": 1 },
                  }),
                  builtinCall("plus", {
                    left: variable(1),
                    right: { "#number": 2 },
                  }),
                ),
              },
            ],
          },
        },
      },
    };
    const compiledWasm = compiler.compile(
      callLoop({ "#number": 1_000_000 }, { "#number": 0 }),
      [{ id: "loop", expression: loop }, ...builtinParts],
    );
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(2_000_000);
  });
});

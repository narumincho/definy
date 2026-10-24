import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  collectReferencedParts,
  createStage1Compiler,
  definyAstToSelfHostedAst,
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
].map((name) => ({ id: name, expression: { Compiler: name } }));

/** テスト用の `apply(f, x) = f(x: x)`. 関数の引数にはラムダ式を書く */
const applyPart = {
  id: "apply",
  expression: {
    Function: {
      parameters: [
        { parameter_id: 100, parameter_name: "f" },
        { parameter_id: 101, parameter_name: "x" },
      ],
      body: {
        Call: {
          function: { Variable: { variable_id: 100 } },
          arguments: [{ name: "x", value: { Variable: { variable_id: 101 } } }],
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
    Call: {
      function: { PartReference: { part_definition_event_hash: name } },
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

    const ast = { Number: { value: 42 } };

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
      left: { Number: { value: 15 } },
      right: { Number: { value: 27 } },
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
          Function: {
            parameters: [{ parameter_id: id, parameter_name: "x" }],
            body: builtinCall("multiply", {
              left: { Variable: { variable_id: id } },
              right: { Number: { value: factor } },
            }),
          },
        },
        x: { Number: { value } },
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
    // core.expression では組み込みのパーツの式は builtin, 呼び出しは他のパーツと同じ call
    expect(definyAstToSelfHostedAst({ Compiler: "minus" })).toEqual({
      Variant: {
        tag: "builtin",
        payload: { String: { value: "minus" } },
      },
    });
  });

  it("呼び出せるのはパーツ・関数型の引数・レコードの関数のフィールドだけ (ラムダ式の即時呼び出しは書けない)", () => {
    const immediate = {
      Call: {
        function: {
          Function: {
            parameters: [{ parameter_id: 0, parameter_name: "x" }],
            body: { Variable: { variable_id: 0 } },
          },
        },
        arguments: [{ name: "x", value: { Number: { value: 1 } } }],
      },
    };
    expect(() => definyAstToSelfHostedAst(immediate)).toThrow(
      SelfHostedAstConversionError,
    );
    // 呼び出しの結果をさらに呼ぶこともできない
    const callOfCall = {
      Call: {
        function: builtinCall("plus", {}),
        arguments: [],
      },
    };
    expect(() => definyAstToSelfHostedAst(callOfCall)).toThrow(
      SelfHostedAstConversionError,
    );
    // core.callee の値は core.expression の同じ名前のバリアントと同じ形
    expect(
      definyAstToSelfHostedAst({
        Call: { function: { Variable: { variable_id: 3 } }, arguments: [] },
      }),
    ).toEqual({
      Variant: {
        tag: "call",
        payload: {
          TypeLiteral: {
            items: [
              {
                key: "function",
                value: {
                  Variant: {
                    tag: "variable",
                    payload: {
                      TypeLiteral: {
                        items: [
                          {
                            key: "variable_id",
                            value: { Number: { value: 3 } },
                          },
                        ],
                      },
                    },
                  },
                },
              },
              { key: "arguments", value: { ListLiteral: { items: [] } } },
            ],
          },
        },
      },
    });
  });

  it("compiles and evaluates definy JSON AST triangle area ((10 * 5) / 2 = 25)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const stage1Module = new WebAssembly.Module(wasmBytes);
    const compiler = createStage1Compiler(stage1Module);

    const triangleAst = {
      Let: {
        bindings: [
          {
            variable_id: 1,
            variable_name: "base",
            value: { Number: { value: 10 } },
          },
          {
            variable_id: 2,
            variable_name: "height",
            value: { Number: { value: 5 } },
          },
        ],
        body: builtinCall("divide", {
          left: builtinCall("multiply", {
            left: { Variable: { variable_id: 1 } },
            right: { Variable: { variable_id: 2 } },
          }),
          right: { Number: { value: 2 } },
        }),
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

  it("compiles and evaluates a call to a referenced part (Call + PartReference with 32-byte ID)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));

    // CBOR / seed から来る PartReference の ID は 32 バイトのバイト列
    const doubleId = Array.from({ length: 32 }, (_, i) => i);
    const offsetId = new Uint8Array(32).fill(7);
    const partExpressions = new Map<string, unknown>([
      [
        // double(x) = x * 2 + offset
        "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
        {
          Function: {
            parameters: [{ parameter_id: 1, parameter_name: "x" }],
            body: builtinCall("plus", {
              left: builtinCall("multiply", {
                left: { Variable: { variable_id: 1 } },
                right: { Number: { value: 2 } },
              }),
              right: {
                PartReference: { part_definition_event_hash: offsetId },
              },
            }),
          },
        },
      ],
      // offset = 2
      ["BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc", { Number: { value: 2 } }],
      ...builtinParts.map((part) => [part.id, part.expression] as const),
    ]);
    const expression = {
      Call: {
        function: { PartReference: { part_definition_event_hash: doubleId } },
        arguments: [{ name: "x", value: { Number: { value: 20 } } }],
      },
    };

    const { parts, unresolved } = collectReferencedParts(expression, (id) =>
      partExpressions.get(id),
    );
    // コンパイラ組み込みのパーツも他のパーツと同じ順 (後に現れた参照から) で入る
    expect(parts.map((part) => part.id)).toEqual([
      "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
      "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
      "multiply",
      "plus",
    ]);
    expect(unresolved).toEqual([]);

    const compiledWasm = compiler.compile(expression, parts);
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(42);
  });

  it("reports parts that cannot be passed to stage1 as unresolved", () => {
    const expression = builtinCall("plus", {
      left: { PartReference: { part_definition_event_hash: "missing" } },
      right: { PartReference: { part_definition_event_hash: "builtin" } },
    });
    const { parts, unresolved } = collectReferencedParts(expression, (id) =>
      id === "builtin" || id === "plus" ? { Compiler: id } : undefined,
    );
    // コンパイラ組み込みのパーツは呼び出さずに参照していても渡す. 後に現れた参照から調べる (LIFO)
    expect(parts).toEqual([
      { id: "builtin", expression: { Compiler: "builtin" } },
      { id: "plus", expression: { Compiler: "plus" } },
    ]);
    expect(unresolved).toEqual(["missing"]);
  });

  it("rejects expressions that core.expression cannot represent", () => {
    expect(() => definyAstToSelfHostedAst({ Hole: null })).toThrow(
      SelfHostedAstConversionError,
    );
    expect(() => definyAstToSelfHostedAst("TypeNumber")).toThrow(
      SelfHostedAstConversionError,
    );
  });

  it("compiles tail calls to return_call_indirect so that deep tail recursion does not overflow the stack", async () => {
    const compiler = createStage1Compiler(
      new WebAssembly.Module(fs.readFileSync("wasm/stage1.wasm")),
    );
    const variable = (id: number) => ({ Variable: { variable_id: id } });
    const callLoop = (n: unknown, acc: unknown) => ({
      Call: {
        function: { PartReference: { part_definition_event_hash: "loop" } },
        arguments: [
          { name: "n", value: n },
          { name: "acc", value: acc },
        ],
      },
    });
    // loop(n, acc) = n <= 0 ? acc : loop(n - 1, acc + 2). 呼び出しは match のアームの中の末尾位置
    const loop = {
      Function: {
        parameters: [
          { parameter_id: 0, parameter_name: "n" },
          { parameter_id: 1, parameter_name: "acc" },
        ],
        body: {
          Match: {
            target: builtinCall("less_than_or_equal", {
              left: variable(0),
              right: { Number: { value: 0 } },
            }),
            arms: [
              {
                tag: "true",
                variable_id: null,
                variable_name: null,
                body: variable(1),
              },
              {
                tag: "false",
                variable_id: null,
                variable_name: null,
                body: callLoop(
                  builtinCall("minus", {
                    left: variable(0),
                    right: { Number: { value: 1 } },
                  }),
                  builtinCall("plus", {
                    left: variable(1),
                    right: { Number: { value: 2 } },
                  }),
                ),
              },
            ],
            default: null,
          },
        },
      },
    };
    const compiledWasm = compiler.compile(
      callLoop({ Number: { value: 1_000_000 } }, { Number: { value: 0 } }),
      [{ id: "loop", expression: loop }, ...builtinParts],
    );
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(2_000_000);
  });
});

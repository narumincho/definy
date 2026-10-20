import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  collectReferencedParts,
  createStage1Compiler,
  definyAstToSelfHostedAst,
  evaluateCompiledWasm,
  SelfHostedAstConversionError,
} from "./stage1_compiler.ts";

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

    const ast = {
      Add: {
        left: { Number: { value: 15 } },
        right: { Number: { value: 27 } },
      },
    };

    const compiledWasm = compiler.compile(ast);
    const evaluated = await evaluateCompiledWasm(compiledWasm);
    expect(evaluated).toBe(42);
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
        body: {
          Divide: {
            left: {
              Multiply: {
                left: { Variable: { variable_id: 1 } },
                right: { Variable: { variable_id: 2 } },
              },
            },
            right: { Number: { value: 2 } },
          },
        },
      },
    };

    const compiledWasm = compiler.compile(triangleAst);
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
            body: {
              Add: {
                left: {
                  Multiply: {
                    left: { Variable: { variable_id: 1 } },
                    right: { Number: { value: 2 } },
                  },
                },
                right: {
                  PartReference: { part_definition_event_hash: offsetId },
                },
              },
            },
          },
        },
      ],
      // offset = 2
      ["BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc", { Number: { value: 2 } }],
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
    expect(parts.map((part) => part.id)).toEqual([
      "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
      "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
    ]);
    expect(unresolved).toEqual([]);

    const compiledWasm = compiler.compile(expression, parts);
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(42);
  });

  it("reports parts that cannot be passed to stage1 as unresolved", () => {
    const expression = {
      Add: {
        left: { PartReference: { part_definition_event_hash: "missing" } },
        right: { PartReference: { part_definition_event_hash: "builtin" } },
      },
    };
    const { parts, unresolved } = collectReferencedParts(expression, (id) =>
      id === "builtin" ? { Compiler: "let" } : undefined,
    );
    expect(parts).toEqual([]);
    // 旧 Rust 版と同じく後に現れた参照から調べる
    expect(unresolved).toEqual(["builtin", "missing"]);
  });

  it("rejects expressions that core.expression cannot represent", () => {
    expect(() => definyAstToSelfHostedAst({ Hole: null })).toThrow(
      SelfHostedAstConversionError,
    );
    expect(() =>
      definyAstToSelfHostedAst({
        BitAnd: {
          left: { Number: { value: 1 } },
          right: { Number: { value: 1 } },
        },
      }),
    ).toThrow(SelfHostedAstConversionError);
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
            target: {
              LessThanOrEqual: {
                left: variable(0),
                right: { Number: { value: 0 } },
              },
            },
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
                  {
                    Subtract: {
                      left: variable(0),
                      right: { Number: { value: 1 } },
                    },
                  },
                  {
                    Add: { left: variable(1), right: { Number: { value: 2 } } },
                  },
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
      [{ id: "loop", expression: loop }],
    );
    expect(await evaluateCompiledWasm(compiledWasm)).toBe(2_000_000);
  });
});

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

describe("stage1 compiler in pure TypeScript / WebAssembly", () => {
  it("compiles and evaluates number literal (42)", async () => {
    const wasmBytes = fs.readFileSync("wasm/stage1.wasm");
    const stage1Module = new WebAssembly.Module(wasmBytes);
    const compiler = createStage1Compiler(stage1Module);

    // Number(42) in self-hosted AST:
    // Variant("number", Number(42))
    const ast = {
      Variant: {
        tag: "number",
        payload: {
          Number: { value: 42 },
        },
      },
    };

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
      Variant: {
        tag: "add",
        payload: {
          TypeLiteral: {
            items: [
              {
                key: "left",
                value: {
                  Variant: {
                    tag: "number",
                    payload: { Number: { value: 15 } },
                  },
                },
              },
              {
                key: "right",
                value: {
                  Variant: {
                    tag: "number",
                    payload: { Number: { value: 27 } },
                  },
                },
              },
            ],
          },
        },
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
});

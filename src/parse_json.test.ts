import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileSeedFunction } from "./event_check.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "./stage1_compiler.ts";

const seedExpressions = await loadSeedPartExpressions();
const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const instance = instantiateCompiledFunction(
  new WebAssembly.Module(
    new Uint8Array(
      compileSeedFunction({
        compiler,
        partId: deriveModulePartId(deriveModuleIdBytes("definy"), "parse-json"),
        resolvePart: (id) => seedExpressions.get(id),
      }),
    ),
  ),
);
const parseJson = (text: string): unknown =>
  instance.read(instance.call({ text: instance.writeArgument(text) }));

describe("definy.parse-json", () => {
  it("JSON のテキストを definy.json の値にする", () => {
    expect(
      parseJson(
        ' { "events": [ {"eventHash": "a\\"b", "timeMs": 1793987798000} , [] , {} ], "ok": true, "none": null, "n": -3 } ',
      ),
    ).toEqual({
      "#ok": {
        "#object": [
          {
            key: "events",
            value: {
              "#array": [
                {
                  "#object": [
                    { key: "eventHash", value: { "#string": 'a"b' } },
                    { key: "timeMs", value: { "#number": 1793987798000 } },
                  ],
                },
                { "#array": [] },
                { "#object": [] },
              ],
            },
          },
          { key: "ok", value: { "#boolean": true } },
          { key: "none", value: { "#null": null } },
          { key: "n", value: { "#number": -3 } },
        ],
      },
    });
  });

  it("壊れた JSON や整数でない数はエラー", () => {
    for (const text of ["[1, 2", '{"a" 1}', "1.5", "1e3", "[] x", ""]) {
      expect(parseJson(text)).toEqual({ "#error": expect.any(String) });
    }
  });
});

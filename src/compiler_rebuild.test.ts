import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  COMPILE_TO_WASM_PART_ID,
  compileTypeCheckerWith,
  selfCompile,
} from "./compiler_rebuild.ts";
import { checkParts } from "./self_hosted_type_check.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";

const seedPartExpressions = await loadSeedPartExpressions();
const stage1 = new Uint8Array(await readFile("wasm/stage1.wasm"));

describe("コンパイラを作り直す", () => {
  it("seed の core.compile-to-wasm を stage1 でコンパイルすると, stage1 そのもの (不動点) になる", () => {
    const result = selfCompile({
      compiler: stage1,
      resolvePart: (id) => seedPartExpressions.get(id),
      maxRounds: 1,
    });
    expect(result.kind).toBe("fixed_point");
    if (result.kind !== "fixed_point") return;
    expect(result.rounds).toBe(1);
    expect(result.compiler).toEqual(stage1);
  });

  it("作り直したコンパイラでコンパイルした型チェッカーで検査できる", () => {
    const typeChecker = new WebAssembly.Module(
      compileTypeCheckerWith(stage1, (id) =>
        seedPartExpressions.get(id),
      ) as BufferSource,
    );
    expect(
      checkParts({
        typeChecker,
        parts: [
          { partType: { "#number": null }, expression: { "#number": 1 } },
          { partType: { "#string": null }, expression: { "#number": 1 } },
        ],
        env: [],
      }).map((outcome) => outcome.kind),
    ).toEqual(["ok", "type_error"]);
  });

  it("参照するパーツが無ければ作り直さない", () => {
    const result = selfCompile({
      compiler: stage1,
      resolvePart: (id) =>
        id === COMPILE_TO_WASM_PART_ID
          ? seedPartExpressions.get(id)
          : undefined,
      maxRounds: 1,
    });
    expect(result.kind).toBe("unresolved_parts");
  });
});

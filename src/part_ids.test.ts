import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bytesToUrlSafeBase64NoPad } from "./base64.ts";
import {
  deriveModuleIdBytes,
  deriveModulePartId,
  derivePartIds,
} from "./part_ids.ts";
import { compileSeedFunction } from "./event_check.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "./stage1_compiler.ts";

const deriver = new WebAssembly.Module(
  readFileSync("wasm/part_id_deriver.wasm"),
);

const seedExpressions = await loadSeedPartExpressions();
const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);

/** seed の関数のパーツ `moduleName.partName` をコンパイルして呼ぶ */
function callSeedPart(
  moduleName: string,
  partName: string,
  args: Record<string, unknown>,
): unknown {
  const instance = instantiateCompiledFunction(
    new WebAssembly.Module(
      new Uint8Array(
        compileSeedFunction({
          compiler,
          partId: deriveModulePartId(deriveModuleIdBytes(moduleName), partName),
          resolvePart: (id) => seedExpressions.get(id),
        }),
      ),
    ),
  );
  return instance.read(
    instance.call(
      Object.fromEntries(
        Object.entries(args).map(([key, value]) => [
          key,
          instance.writeArgument(value),
        ]),
      ),
    ),
  );
}

describe("core.sha256", () => {
  // パディングで 1 ブロックに収まる最大 (55), 2 ブロックになる (56), ちょうど 1 ブロック (64), 複数ブロック
  for (const length of [0, 1, 55, 56, 63, 64, 65, 130]) {
    it(`${length} バイトのハッシュが node:crypto と一致する`, () => {
      const bytes = Array.from({ length }, (_, i) => (i * 37 + 11) % 256);
      expect(callSeedPart("core", "sha256", { bytes })).toEqual([
        ...createHash("sha256").update(Uint8Array.from(bytes)).digest(),
      ]);
    });
  }
});

describe("core.bytes-to-base64url", () => {
  for (const length of [0, 1, 2, 3, 32]) {
    it(`${length} バイトがパディング無しの Base64URL になる`, () => {
      const bytes = Array.from({ length }, (_, i) => 255 - i * 3);
      expect(callSeedPart("core", "bytes-to-base64url", { bytes })).toBe(
        bytesToUrlSafeBase64NoPad(Uint8Array.from(bytes)),
      );
    });
  }
});

describe("derivePartIds (core.module-part-ids)", () => {
  it("TypeScript の導出と同じモジュール ID とパーツ ID になる", () => {
    const modules = [
      { moduleName: "core", partNames: ["type-checker", "plus"] },
      { moduleName: "日本語のモジュール", partNames: ["パーツ", ""] },
      { moduleName: "app", partNames: [] },
    ];
    expect(derivePartIds(deriver, modules)).toEqual(
      modules.map(({ moduleName, partNames }) => {
        const moduleIdBytes = deriveModuleIdBytes(moduleName);
        return {
          moduleId: bytesToUrlSafeBase64NoPad(moduleIdBytes),
          partIds: partNames.map((name) =>
            deriveModulePartId(moduleIdBytes, name),
          ),
        };
      }),
    );
  });

  it("一度求めた名前と新しい名前が混ざっていても順番どおりに返す", () => {
    derivePartIds(deriver, [{ moduleName: "mixed", partNames: ["b"] }]);
    const moduleIdBytes = deriveModuleIdBytes("mixed");
    expect(
      derivePartIds(deriver, [
        { moduleName: "mixed", partNames: ["a", "b", "c", "a"] },
      ])[0]?.partIds,
    ).toEqual(
      ["a", "b", "c", "a"].map((name) =>
        deriveModulePartId(moduleIdBytes, name),
      ),
    );
  });
});

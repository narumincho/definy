import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { compileSeedFunction } from "./event_check.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "./stage1_compiler.ts";

const seedExpressions = await loadSeedPartExpressions();
const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);

/** seed の std の関数のパーツをコンパイルして, 引数を変えて何度も呼べるようにする */
function seedStdFunction(
  partName: string,
): (args: Record<string, unknown>) => unknown {
  const instance = instantiateCompiledFunction(
    new WebAssembly.Module(
      new Uint8Array(
        compileSeedFunction({
          compiler,
          partId: deriveModulePartId(deriveModuleIdBytes("std"), partName),
          resolvePart: (id) => seedExpressions.get(id),
        }),
      ),
    ),
  );
  return (args) =>
    instance.read(
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

describe("std.bytes-to-string", () => {
  const bytesToString = seedStdFunction("bytes-to-string");
  it("UTF-8 のバイト列を文字列にする (全ての先頭バイトと継続バイト)", () => {
    const codePoints = [
      ...Array.from({ length: 128 }, (_, i) => i),
      // 2 バイト: 先頭 C2〜DF と継続 80〜BF
      ...Array.from({ length: 30 }, (_, i) => 0x80 + i * 64 + (i % 64)),
      ...Array.from({ length: 64 }, (_, i) => 0x80 + i),
      // 3 バイト: 先頭 E0〜EF (サロゲートの範囲は避ける)
      ...Array.from({ length: 16 }, (_, i) =>
        i === 0 ? 0x800 : i === 13 ? 0xd7ff : i * 0x1000 + 0x123,
      ),
      // 4 バイト: 先頭 F0〜F4
      0x10000,
      0x1f600,
      0x40000,
      0xfffff,
      0x10ffff,
    ];
    const text = String.fromCodePoint(...codePoints);
    const bytes = [...new TextEncoder().encode(text)];
    expect(bytesToString({ bytes })).toBe(text);
    expect(bytesToString({ bytes: [] })).toBe("");
  });
});

describe("std.base64-to-bytes", () => {
  const base64ToBytes = seedStdFunction("base64-to-bytes");
  for (const length of [0, 1, 2, 3, 4, 5, 32, 100]) {
    const bytes = Array.from({ length }, (_, i) => (i * 97 + 251) % 256);
    const buffer = Buffer.from(bytes);
    it(`${length} バイトの Base64 / Base64URL (パディング有り無し) を読む`, () => {
      for (const text of [
        buffer.toString("base64"),
        buffer.toString("base64url"),
        buffer.toString("base64").replace(/=+$/, ""),
      ]) {
        expect(base64ToBytes({ text })).toEqual({ "#some": bytes });
      }
    });
  }
  it("Base64 でない文字や余る 1 文字は none", () => {
    for (const text of ["ab*d", "abcde", "a", "!!!!"]) {
      expect(base64ToBytes({ text })).toEqual({ "#none": null });
    }
  });
});

/**
 * Rust (definy-core) と TypeScript (cbor_eval.ts) の評価器の挙動を揃えるための適合テスト。
 *
 * テストケースは `conformance/eval_cases.json` にあり、同じファイルを Rust 側の
 * `definy-server/tests/eval_conformance.rs` も読み込んで検証する。
 */
import { assertEquals } from "@std/assert";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import coreSeed from "../seeds/core.json" with { type: "json" };
import definySeed from "../seeds/definy.json" with { type: "json" };
import sampleSeed from "../seeds/sample.json" with { type: "json" };
import stdSeed from "../seeds/std.json" with { type: "json" };
import wasiSeed from "../seeds/wasi.json" with { type: "json" };
import {
  bytesToUrlSafeBase64NoPad,
  type DefinyValue,
  deriveModuleIdBytes,
  deriveModulePartId,
  evaluateCborExpression,
} from "./cbor_eval.ts";

/** `definy-server` の `COMPILER_SYSTEM_KEY_SEED` と同じ値 */
const COMPILER_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

/** Ed25519 秘密鍵シードからビルトインシステムアカウントの公開鍵を導出する */
async function builtinSystemAccountBytes(): Promise<Uint8Array> {
  // PKCS#8 の Ed25519 秘密鍵ヘッダー (RFC 8410) + 32 バイトのシード
  const header = [
    0x30,
    0x2e,
    0x02,
    0x01,
    0x00,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x70,
    0x04,
    0x22,
    0x04,
    0x20,
  ];
  const pkcs8 = new Uint8Array([...header, ...COMPILER_SYSTEM_KEY_SEED]);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const b64 = (jwk.x ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type Seed = {
  readonly module_name: string;
  readonly parts: ReadonlyArray<
    { readonly name: string; expression?: unknown }
  >;
};

const seeds: ReadonlyArray<Seed> = [
  definySeed,
  coreSeed,
  stdSeed,
  wasiSeed,
  sampleSeed,
] as ReadonlyArray<Seed>;

/** パーツ ID (URL-safe base64) → 式 と、"module.name" → パーツ ID (バイト列) の対応を作る */
async function buildPartTables(): Promise<{
  readonly partExpressions: ReadonlyMap<string, unknown>;
  readonly partIdBytes: ReadonlyMap<string, ReadonlyArray<number>>;
}> {
  const accountBytes = await builtinSystemAccountBytes();
  const partExpressions = new Map<string, unknown>();
  const partIdBytes = new Map<string, ReadonlyArray<number>>();
  for (const seed of seeds) {
    const moduleIdBytes = await deriveModuleIdBytes(
      accountBytes,
      seed.module_name,
    );
    for (const part of seed.parts) {
      const id = await deriveModulePartId(moduleIdBytes, part.name);
      if (part.expression !== undefined && part.expression !== null) {
        partExpressions.set(id, part.expression);
      }
      const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      partIdBytes.set(
        `${seed.module_name}.${part.name}`,
        Array.from(atob(padded), (c) => c.charCodeAt(0)),
      );
    }
  }
  return { partExpressions, partIdBytes };
}

/** `{"$part": "module.name"}` を PartReference 式に置き換える */
function resolvePartPlaceholders(
  expr: unknown,
  partIdBytes: ReadonlyMap<string, ReadonlyArray<number>>,
): unknown {
  if (Array.isArray(expr)) {
    return expr.map((item) => resolvePartPlaceholders(item, partIdBytes));
  }
  if (expr && typeof expr === "object") {
    const obj = expr as Record<string, unknown>;
    if (typeof obj.$part === "string") {
      const bytes = partIdBytes.get(obj.$part);
      if (!bytes) {
        throw new Error(`unknown builtin part: ${obj.$part}`);
      }
      return { PartReference: { part_definition_event_hash: bytes } };
    }
    return Object.fromEntries(
      Object.entries(obj).map((
        [key, value],
      ) => [key, resolvePartPlaceholders(value, partIdBytes)]),
    );
  }
  return expr;
}

/** TypeScript 評価器の値を、テストケースの期待値と同じ正規化表現へ変換する */
function normalize(value: DefinyValue): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if ("__variant" in value) {
    const v = value as { __variant: string; payload: DefinyValue };
    return {
      $variant: v.__variant,
      payload: v.payload === undefined || v.payload === null
        ? null
        : normalize(v.payload),
    };
  }
  if ("__fn" in value || "__nativeFn" in value) {
    return { $function: true };
  }
  return {
    $record: Object.entries(value as Record<string, DefinyValue>).map((
      [key, item],
    ) => [key, normalize(item)]),
  };
}

const tables = await buildPartTables();

for (const testCase of cases.cases) {
  Deno.test(`eval conformance: ${testCase.name}`, async () => {
    const expr = resolvePartPlaceholders(
      testCase.expression,
      tables.partIdBytes,
    );
    const result = await evaluateCborExpression(
      expr,
      new Map(),
      (partHash) => Promise.resolve(tables.partExpressions.get(partHash)),
    );
    assertEquals(normalize(result), testCase.expected);
  });
}

Deno.test("builtin system account bytes are 32 bytes", async () => {
  const bytes = await builtinSystemAccountBytes();
  assertEquals(bytes.length, 32);
  assertEquals(bytesToUrlSafeBase64NoPad(bytes).length, 43);
});

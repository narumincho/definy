/**
 * Worker 用ランタイム（`definy-worker-runtime` を wasm32 にビルドしたもの）が、
 * Rust サーバーと同じ評価結果を返すことを検証する適合テスト。
 *
 * テストケースは `conformance/eval_cases.json` にあり、同じファイルを Rust 側の
 * `definy-server/tests/eval_conformance.rs`（wasmtime）と `wasmi_backend.rs`（wasmi）も検証する。
 * 実行前にランタイムと seed バンドルのビルドが必要（`worker/test_runtime.ts` を参照）。
 */
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  base64ToBytes,
  deriveModuleIdBytes,
  deriveModulePartId,
} from "./cbor.ts";
import { getDefinyRuntime } from "./definy_runtime.ts";
import { loadTestSeedBundle, setupTestRuntime } from "./test_runtime.ts";

/** `definy-server` の開発用システムアカウント鍵 (`DEV_SYSTEM_KEY_SEED`) と同じ値 */
const DEV_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

/** Ed25519 秘密鍵シードから開発用システムアカウントの公開鍵を導出する */
async function devSystemAccountBytes(): Promise<Uint8Array> {
  // PKCS#8 の Ed25519 秘密鍵ヘッダー (RFC 8410) + 32 バイトのシード
  const header = [
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20,
  ];
  const key = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([...header, ...DEV_SYSTEM_KEY_SEED]),
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return base64ToBytes(jwk.x ?? "");
}

/** `{"$part": "module.name"}` をパーツ ID（バイト列）に置き換える（seed と同じ形式） */
async function resolvePartPlaceholders(
  expr: unknown,
  accountBytes: Uint8Array,
): Promise<unknown> {
  if (Array.isArray(expr)) {
    return await Promise.all(
      expr.map((item) => resolvePartPlaceholders(item, accountBytes)),
    );
  }
  if (expr && typeof expr === "object") {
    const obj = expr as Record<string, unknown>;
    if (typeof obj.$part === "string") {
      const dot = obj.$part.indexOf(".");
      const moduleId = await deriveModuleIdBytes(
        accountBytes,
        obj.$part.slice(0, dot),
      );
      const partId = await deriveModulePartId(
        moduleId,
        obj.$part.slice(dot + 1),
      );
      return Array.from(base64ToBytes(partId));
    }
    const entries = await Promise.all(
      Object.entries(obj).map(async ([key, value]) => [
        key,
        await resolvePartPlaceholders(value, accountBytes),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return expr;
}

await setupTestRuntime();
const runtime = await getDefinyRuntime();
const bundle = await loadTestSeedBundle();
runtime.callOrThrow({
  op: "loadEvents",
  events: bundle.events.map((ev) => ev.signedEventBytes),
});
if (bundle.contents && bundle.contents.length > 0) {
  const contentsMap: Record<string, string> = {};
  for (const c of bundle.contents) {
    contentsMap[c.contentHash] = c.contentBytes;
  }
  runtime.callOrThrow({
    op: "loadContents",
    contents: contentsMap,
  });
}
const accountBytes = await devSystemAccountBytes();

describe("eval conformance (worker runtime)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(
        testCase.expression,
        accountBytes,
      );
      const response = await runtime.callAsync({
        op: "evaluateExpression",
        expression,
      });
      if (response.type === "error") {
        throw new Error(response.message);
      }
      expect(response.type).toBe("value");
      if (response.type === "value") {
        expect(response.value).toEqual(testCase.expected);
      }
    });
  }
});

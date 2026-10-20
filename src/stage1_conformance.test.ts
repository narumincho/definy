import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "../conformance/eval_cases.json" with { type: "json" };
import {
  base64ToBytes,
  deriveModuleIdBytes,
  deriveModulePartId,
} from "../worker/cbor.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  evaluateCompiledWasm,
} from "./stage1_compiler.ts";

/** `definy-server` の開発用システムアカウント鍵 (`DEV_SYSTEM_KEY_SEED`) と同じ値 */
const DEV_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

/** Ed25519 秘密鍵シードから開発用システムアカウントの公開鍵を導出する */
async function devSystemAccountBytes(): Promise<Uint8Array> {
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

/** `{"$part": "module.name"}` をパーツ ID（バイト列）に置き換える */
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

function normalizeToConformanceValue(val: unknown): unknown {
  if (
    val === null ||
    typeof val === "number" ||
    typeof val === "string" ||
    typeof val === "boolean"
  ) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeToConformanceValue);
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("$variant" in obj) {
      return obj;
    }
    if ("$record" in obj) {
      return obj;
    }
    if ("__variant" in obj) {
      return {
        $variant: obj.__variant,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    if ("tag" in obj && "payload" in obj) {
      return {
        $variant: obj.tag,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    const entries = Object.entries(obj).map(([k, v]) => [
      k,
      normalizeToConformanceValue(v),
    ]);
    return { $record: entries };
  }
  return val;
}

/** `seeds/*.json` の全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
async function loadSeedPartExpressions(
  accountBytes: Uint8Array,
): Promise<ReadonlyMap<string, unknown>> {
  const map = new Map<string, unknown>();
  for (const file of readdirSync("seeds")) {
    if (!file.endsWith(".json") || file === "seed_bundle.json") {
      continue;
    }
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<{
        readonly name: string;
        readonly expression?: unknown;
      }>;
    };
    const moduleId = await deriveModuleIdBytes(accountBytes, seed.module_name);
    for (const part of seed.parts) {
      map.set(
        await deriveModulePartId(moduleId, part.name),
        await resolvePartPlaceholders(part.expression ?? null, accountBytes),
      );
    }
  }
  return map;
}

const wasmBytes = readFileSync("wasm/stage1.wasm");
const compiler = createStage1Compiler(new WebAssembly.Module(wasmBytes));
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

describe("eval conformance (stage1.wasm)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, async () => {
      const expression = await resolvePartPlaceholders(
        testCase.expression,
        accountBytes,
      );
      const { parts, unresolved } = collectReferencedParts(expression, (id) =>
        seedPartExpressions.get(id),
      );
      expect(unresolved).toEqual([]);
      const compiledWasm = compiler.compile(expression, parts);
      const rawValue = await evaluateCompiledWasm(compiledWasm);
      const actualValue = normalizeToConformanceValue(rawValue);
      expect(actualValue).toEqual(testCase.expected);
    });
  }
});

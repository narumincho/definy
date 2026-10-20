import { readdirSync, readFileSync } from "node:fs";
import {
  base64ToBytes,
  deriveModuleIdBytes,
  deriveModulePartId,
} from "../worker/cbor.ts";

/** `definy-server` の開発用システムアカウント鍵 (`DEV_SYSTEM_KEY_SEED`) と同じ値 */
export const DEV_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

/** Ed25519 秘密鍵シードから開発用システムアカウントの公開鍵を導出する */
export async function devSystemAccountBytes(): Promise<Uint8Array> {
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
export async function resolvePartPlaceholders(
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

/** `seeds/*.json` の全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
export async function loadSeedPartExpressions(
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

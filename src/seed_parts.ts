import { readdirSync, readFileSync } from "node:fs";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";

export {
  DEV_SYSTEM_KEY_SEED,
  devSystemAccountBytes,
} from "./system_account.ts";

async function seedPartId(name: string): Promise<string> {
  const dot = name.indexOf(".");
  const moduleId = await deriveModuleIdBytes(name.slice(0, dot));
  return await deriveModulePartId(moduleId, name.slice(dot + 1));
}

/**
 * `{"$part": "module.name"}` をパーツ ID の文字列 (URL-safe Base64) に置き換える.
 * 式の `part_reference` も `core.type-ast` の `reference` もパーツ ID を文字列で持つ (docs/value-encoding.md)
 */
export async function resolvePartPlaceholders(expr: unknown): Promise<unknown> {
  if (Array.isArray(expr)) {
    return await Promise.all(expr.map((item) => resolvePartPlaceholders(item)));
  }
  if (expr && typeof expr === "object") {
    const obj = expr as Record<string, unknown>;
    if (typeof obj.$part === "string") {
      return await seedPartId(obj.$part);
    }
    const entries = await Promise.all(
      Object.entries(obj).map(async ([key, value]) => [
        key,
        await resolvePartPlaceholders(value),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return expr;
}

/**
 * seed のパーツの型 (`part_type`. 型の式) のプレースホルダーを解決する.
 * 型の無いパーツなら `null`
 */
export async function resolveSeedPartType(partType: unknown): Promise<unknown> {
  return partType == null ? null : await resolvePartPlaceholders(partType);
}

/** `seeds/*.json` の全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
export async function loadSeedPartExpressions(): Promise<
  ReadonlyMap<string, unknown>
> {
  const map = new Map<string, unknown>();
  for (const file of readdirSync("seeds")) {
    // seed_bundle_fingerprint.json はモジュールの seed ではない
    if (!file.endsWith(".json") || file.startsWith("seed_bundle")) {
      continue;
    }
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<{
        readonly name: string;
        readonly expression?: unknown;
      }>;
    };
    const moduleId = await deriveModuleIdBytes(seed.module_name);
    for (const part of seed.parts) {
      map.set(
        await deriveModulePartId(moduleId, part.name),
        await resolvePartPlaceholders(part.expression ?? null),
      );
    }
  }
  return map;
}

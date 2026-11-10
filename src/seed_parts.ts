/**
 * ビルトインのパーツ (`seeds/store/` の `heads.json` のコミット. docs/source-in-store.md) をテストやスクリプトから読む
 */
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import {
  readStoreSeed,
  storeSeedPartExpressions,
  type StoreSeed,
  type StoreSeedModule,
} from "./store_seed.ts";

let cachedStoreSeed: Promise<StoreSeed> | undefined;

/** `seeds/store/` を読む (同じプロセスでは 1 回だけ読む) */
export function loadStoreSeed(): Promise<StoreSeed> {
  cachedStoreSeed ??= readStoreSeed();
  return cachedStoreSeed;
}

async function seedPartId(name: string): Promise<string> {
  const dot = name.indexOf(".");
  const moduleId = deriveModuleIdBytes(name.slice(0, dot));
  return deriveModulePartId(moduleId, name.slice(dot + 1));
}

/**
 * `{"$part": "module.name"}` をパーツ ID の文字列 (URL-safe Base64) に置き換える (テストで式を手で書くとき用).
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

/** ビルトインの全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
export async function loadSeedPartExpressions(): Promise<
  ReadonlyMap<string, unknown>
> {
  return storeSeedPartExpressions(await loadStoreSeed());
}

/** ビルトインの全モジュール (`heads.json` の順のプロジェクトの, コミットの順のモジュール) */
export async function loadSeedModules(): Promise<
  ReadonlyArray<StoreSeedModule>
> {
  return (await loadStoreSeed()).projects.flatMap(
    (project) => project.commit.modules,
  );
}

/** ビルトインのモジュール `name` (無ければ例外) */
export async function loadSeedModule(name: string): Promise<StoreSeedModule> {
  const found = (await loadSeedModules()).find(
    (module) => module.name === name,
  );
  if (found === undefined) {
    throw new Error(`the module ${name} is not in seeds/store`);
  }
  return found;
}

/** ビルトインの全パーツの ID (URL-safe Base64) → `module.name` */
export async function loadSeedPartNames(): Promise<
  ReadonlyMap<string, string>
> {
  return new Map(
    (await loadSeedModules()).flatMap((module) => {
      const moduleId = deriveModuleIdBytes(module.name);
      return module.parts.map(
        (part) =>
          [
            deriveModulePartId(moduleId, part.name),
            `${module.name}.${part.name}`,
          ] as const,
      );
    }),
  );
}

/** {@link resolvePartPlaceholders} の逆. ビルトインのパーツ ID の文字列を `{"$part": "module.name"}` にする */
export function toPartPlaceholders(
  expr: unknown,
  names: ReadonlyMap<string, string>,
): unknown {
  if (typeof expr === "string") {
    const name = names.get(expr);
    return name === undefined ? expr : { $part: name };
  }
  if (Array.isArray(expr)) {
    return expr.map((item) => toPartPlaceholders(item, names));
  }
  if (expr && typeof expr === "object") {
    return Object.fromEntries(
      Object.entries(expr).map(([key, value]) => [
        key,
        toPartPlaceholders(value, names),
      ]),
    );
  }
  return expr;
}

/** モジュール `name` のパーツを, パーツの参照を `{"$part": ...}` にして返す (型パーツの宣言を名前で読むとき用) */
export async function loadSeedModuleWithPlaceholders(name: string): Promise<
  ReadonlyArray<{
    readonly name: string;
    readonly part_type: unknown;
    readonly expression: unknown;
  }>
> {
  const names = await loadSeedPartNames();
  return (await loadSeedModule(name)).parts.map((part) => ({
    name: part.name,
    part_type: toPartPlaceholders(part.partType, names),
    expression: toPartPlaceholders(part.expression, names),
  }));
}

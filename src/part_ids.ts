/**
 * モジュール ID とパーツ ID を definy 製の `core.module-part-ids` で求める (docs/service.md の「パーツ ID の導出」).
 * `npm run build:seeds` が stage1 でコンパイルした `wasm/part_id_deriver.wasm` を `deriver` に渡す.
 *
 * ID はモジュール名とパーツ名だけで決まるので, 一度求めた ID は isolate の中で使い回す
 * (コミットはどれも同じ名前のパーツを多く持つので, 新しい名前の分だけ definy で求める)
 */
import { bytesToUrlSafeBase64NoPad } from "./base64.ts";
import { sha256BytesSync } from "./sha256.ts";
import { instantiateCompiledFunction } from "./stage1_compiler.ts";

type ModulePartNames = {
  readonly moduleName: string;
  readonly partNames: ReadonlyArray<string>;
};

type ModulePartIds = {
  readonly moduleId: string;
  /** `partNames` と同じ順のパーツ ID */
  readonly partIds: ReadonlyArray<string>;
};

type CachedModule = {
  readonly moduleId: string;
  readonly partIds: Map<string, string>;
};

/** モジュール名ごとの, 求めたモジュール ID とパーツ ID (キーはパーツ名) */
const cache = new WeakMap<WebAssembly.Module, Map<string, CachedModule>>();

/** 各モジュールのモジュール ID とパーツ ID */
export function derivePartIds(
  deriver: WebAssembly.Module,
  modules: ReadonlyArray<ModulePartNames>,
): ReadonlyArray<ModulePartIds> {
  let byModule = cache.get(deriver);
  if (byModule === undefined) {
    byModule = new Map();
    cache.set(deriver, byModule);
  }
  let instance: ReturnType<typeof instantiateCompiledFunction> | undefined;
  return modules.map(({ moduleName, partNames }) => {
    const cached = byModule.get(moduleName);
    const missing = [
      ...new Set(partNames.filter((name) => !cached?.partIds.has(name))),
    ];
    let entry = cached;
    if (entry === undefined || missing.length > 0) {
      instance ??= instantiateCompiledFunction(deriver);
      const result = instance.read(
        instance.call({
          module_name: instance.writeArgument(moduleName),
          part_names: instance.writeArgument(missing),
        }),
      ) as { readonly module_id?: unknown; readonly part_ids?: unknown };
      const { module_id: moduleId, part_ids: partIds } = result;
      if (
        typeof moduleId !== "string" ||
        !Array.isArray(partIds) ||
        partIds.length !== missing.length
      ) {
        throw new Error("core.module-part-ids returned an unexpected value");
      }
      const updated = entry ?? { moduleId, partIds: new Map<string, string>() };
      missing.forEach((name, i) => {
        const id: unknown = partIds[i];
        if (typeof id !== "string") {
          throw new Error("core.module-part-ids returned a non-string part ID");
        }
        updated.partIds.set(name, id);
      });
      byModule.set(moduleName, updated);
      entry = updated;
    }
    const found = entry;
    return {
      moduleId: found.moduleId,
      partIds: partNames.map((name) => found.partIds.get(name) ?? ""),
    };
  });
}

const TEXT_ENCODER = new TextEncoder();
const MODULE_PREFIX_BYTES = TEXT_ENCODER.encode("definy:module:");
const PART_SEP_BYTES = TEXT_ENCODER.encode(":part:");

/**
 * モジュール名から Module ID の内部 32 バイトを導出する (`definy:module:` + 名前 の SHA-256 を 2 回).
 * モジュールはアカウントによらず名前で決まり, 誰がコミットできるかはブランチで決まる (docs/branch.md).
 * サーバーは definy 製の `core.module-part-ids` (src/part_ids.ts) で求める. これはシードの生成とブラウザで使う
 */
export function deriveModuleIdBytes(moduleName: string): Uint8Array {
  const nameBytes = TEXT_ENCODER.encode(moduleName);
  const buf = new Uint8Array(MODULE_PREFIX_BYTES.length + nameBytes.length);
  buf.set(MODULE_PREFIX_BYTES, 0);
  buf.set(nameBytes, MODULE_PREFIX_BYTES.length);
  return sha256BytesSync(sha256BytesSync(buf));
}

/**
 * Module ID とパーツ名から Part ID (`EventHashId` 文字列) を導出する (Module ID + `:part:` + 名前 の SHA-256 を 2 回)
 */
export function deriveModulePartId(
  moduleIdBytes: Uint8Array,
  partName: string,
): string {
  const nameBytes = TEXT_ENCODER.encode(partName);
  const buf = new Uint8Array(
    moduleIdBytes.length + PART_SEP_BYTES.length + nameBytes.length,
  );
  buf.set(moduleIdBytes, 0);
  buf.set(PART_SEP_BYTES, moduleIdBytes.length);
  buf.set(nameBytes, moduleIdBytes.length + PART_SEP_BYTES.length);
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(sha256BytesSync(buf)));
}

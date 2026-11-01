/**
 * モジュール ID とパーツ ID を definy 製の `core.module-part-ids` で求める (docs/service.md の「パーツ ID の導出」).
 * `npm run build:seeds` が stage1 でコンパイルした `wasm/part_id_deriver.wasm` を `deriver` に渡す.
 *
 * ID はモジュール名とパーツ名だけで決まるので, 一度求めた ID は isolate の中で使い回す
 * (コミットはどれも同じ名前のパーツを多く持つので, 新しい名前の分だけ definy で求める)
 */
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

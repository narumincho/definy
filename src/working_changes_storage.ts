import type { PartChange, WorkingChanges } from "./types.ts";
/** 作業中の変更を localStorage に保存できる JSON 文字列にする. パーツの式と型は JSON の値そのもの (docs/value-encoding.md) */
export function serializeWorkingChanges(changes: WorkingChanges): string {
  const plainParts: Record<string, PartChange> = Object.fromEntries(
    changes.parts,
  );
  return JSON.stringify({
    parts: plainParts,
    merges: Object.fromEntries(changes.merges ?? new Map<string, string>()),
    newModuleProjects: Object.fromEntries(
      changes.newModuleProjects ?? new Map<string, string>(),
    ),
  });
}

/** `serializeWorkingChanges` の結果を復元する。壊れた JSON のときは空の WorkingChanges を返す */
export function deserializeWorkingChanges(text: string): WorkingChanges {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { parts: new Map<string, PartChange>() };
    }
    const partsRecord = (parsed as { readonly parts?: unknown }).parts;
    if (
      typeof partsRecord !== "object" ||
      partsRecord === null ||
      Array.isArray(partsRecord)
    ) {
      return { parts: new Map<string, PartChange>() };
    }
    const partsMap = new Map<string, PartChange>();
    for (const [k, v] of Object.entries(partsRecord)) {
      if (v !== null && typeof v === "object") {
        partsMap.set(k, v as PartChange);
      }
    }
    return {
      parts: partsMap,
      merges: stringRecord((parsed as { readonly merges?: unknown }).merges),
      newModuleProjects: stringRecord(
        (parsed as { readonly newModuleProjects?: unknown }).newModuleProjects,
      ),
    };
  } catch {
    return { parts: new Map<string, PartChange>() };
  }
}

/** JSON のオブジェクトの, 値が文字列のものだけの Map */
function stringRecord(value: unknown): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string") map.set(k, v);
    }
  }
  return map;
}

/**
 * パーツの名前を変えたときに, そのパーツへの参照を新しい名前の ID に付け替える (docs/ui.md「パーツの名前の変更」).
 * パーツ ID はモジュール名とパーツ名から決まる (docs/content-addressed.md) ので, 名前を変えると ID も変わり,
 * 付け替えないと参照している式・型が `part_not_found` の型エラーになる
 */
import type { PartChange, PartSnapshot, WorkingChanges } from "./types.ts";

/**
 * 値の中の `from` と等しい文字列 (パーツ参照・型の参照・呼び出しのパーツ ID) を `to` にする.
 * 変えるものが無ければ同じ値を返す
 */
export function replacePartId(
  value: unknown,
  from: string,
  to: string,
): unknown {
  if (typeof value === "string") {
    return value === from ? to : value;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const items = value.map((item) => {
      const next = replacePartId(item, from, to);
      if (next !== item) {
        changed = true;
      }
      return next;
    });
    return changed ? items : value;
  }
  if (value !== null && typeof value === "object") {
    let changed = false;
    const entries = Object.entries(value).map(([key, item]) => {
      const next = replacePartId(item, from, to);
      if (next !== item) {
        changed = true;
      }
      return [key, next] as const;
    });
    return changed ? Object.fromEntries(entries) : value;
  }
  return value;
}

/** パーツの定義 (型・式・定義の式) の中の `from` への参照を `to` にする. 変えるものが無ければ同じ値を返す */
export function retargetPartChange(
  change: PartChange,
  from: string,
  to: string,
): PartChange {
  const partType = replacePartId(change.partType, from, to);
  const expression = replacePartId(change.expression, from, to);
  const definition =
    change.definition === undefined
      ? undefined
      : replacePartId(change.definition, from, to);
  if (
    partType === change.partType &&
    expression === change.expression &&
    definition === change.definition
  ) {
    return change;
  }
  return {
    ...change,
    partType,
    expression,
    ...(definition !== undefined ? { definition } : {}),
  };
}

/**
 * `from` を参照している他のパーツ (コミット済みのもの・作業中の変更だけにある新しいパーツ) の参照を `to` に付け替えた
 * 作業中の変更 (キーは作業中の変更のキー). `exceptPartId` (名前を変えたパーツ自身) と削除するパーツは除く
 */
export function retargetReferencesOf(
  parts: ReadonlyArray<PartSnapshot>,
  workingChanges: WorkingChanges,
  from: string,
  to: string,
  exceptPartId: string,
): ReadonlyArray<readonly [string, PartChange]> {
  const result: Array<readonly [string, PartChange]> = [];
  const seen = new Set<string>([exceptPartId]);
  const visit = (key: string, change: PartChange): void => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    if (change.deleted === true) {
      return;
    }
    const next = retargetPartChange(change, from, to);
    if (next !== change) {
      result.push([key, next]);
    }
  };
  for (const part of parts) {
    visit(
      part.partId,
      workingChanges.parts.get(part.partId) ?? {
        moduleDefinitionEventHash: part.moduleId,
        partDefinitionEventHash: part.partId,
        name: part.name,
        description: part.description,
        partType: part.partType,
        expression: part.expression,
      },
    );
  }
  for (const [key, change] of workingChanges.parts) {
    visit(key, change);
  }
  return result;
}

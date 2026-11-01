/**
 * コミット済みのパーツに作業中の変更を重ねた「作業中のパーツ」 (docs/ui.md「作業中のパーツ」).
 * 式エディタの選択肢・型の問い合わせ・実行パネルはこれを使い, コミットしていない新しいパーツも参照・実行できるようにする.
 *
 * パーツ ID はモジュール名とパーツ名だけから決まる (docs/content-addressed.md「決定論的 ID 生成」) ので,
 * コミット前でもコミットしたときの ID が分かる. 名前を変えたパーツは新しい名前の ID にする (コミットするとその ID になる)
 */
import { bytesToUrlSafeBase64NoPad } from "./base64.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { DEFAULT_VISIBILITY } from "./event_content.ts";
import { isTypePartType, type LatestPart } from "./self_hosted_type_check.ts";
import type { PartChange, PartSnapshot, WorkingChanges } from "./types.ts";

/** モジュール `moduleName` のパーツ `partName` のパーツ ID (コミットしたときの ID) */
export function partIdHashOf(moduleName: string, partName: string): string {
  return deriveModulePartId(deriveModuleIdBytes(moduleName), partName);
}

/** 作業中の変更のキー (`モジュール名.元のパーツ名`) のモジュール名 */
function moduleNameOfKey(key: string): string {
  const dot = key.indexOf(".");
  return dot < 0 ? key : key.slice(0, dot);
}

type WorkingPartsView = {
  /** `module.name` ごとのパーツ (`partId` は作業中の変更のキーと同じ `モジュール名.元のパーツ名`) */
  readonly parts: ReadonlyArray<PartSnapshot>;
  /** パーツ ID → パーツ. 名前を変えたパーツは新しい ID, 削除したパーツは無い */
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  /** パーツ ID (と `module.name`) → 表示名 `module.name` */
  readonly partNames: ReadonlyMap<string, string>;
};

/**
 * コミット済みのパーツ (`parts` / `partsByIdHash` / `partNames`) に作業中の変更を重ねる.
 * 変更が無ければ渡したものをそのまま返す
 */
export function workingPartsView(
  committed: WorkingPartsView,
  workingChanges: WorkingChanges,
): WorkingPartsView {
  if (workingChanges.parts.size === 0) {
    return committed;
  }
  const byKey = new Map(committed.parts.map((part) => [part.partId, part]));
  const partsByIdHash = new Map(committed.partsByIdHash);
  const partNames = new Map(committed.partNames);
  for (const [key, change] of workingChanges.parts) {
    const moduleName = moduleNameOfKey(key);
    const originalName = key.slice(moduleName.length + 1);
    const base = byKey.get(key);
    partsByIdHash.delete(partIdHashOf(moduleName, originalName));
    if (change.deleted === true) {
      byKey.delete(key);
      continue;
    }
    const snapshot = changedPartSnapshot(key, moduleName, change, base);
    byKey.set(key, snapshot);
    if (snapshot.partIdHash !== null) {
      partsByIdHash.set(snapshot.partIdHash, snapshot);
      partNames.set(snapshot.partIdHash, `${moduleName}.${change.name}`);
    }
  }
  return { parts: [...byKey.values()], partsByIdHash, partNames };
}

function changedPartSnapshot(
  key: string,
  moduleName: string,
  change: PartChange,
  base: PartSnapshot | undefined,
): PartSnapshot {
  return {
    partId: key,
    moduleId: base?.moduleId ?? moduleName,
    moduleName,
    name: change.name,
    description: change.description,
    visibility: change.visibility ?? base?.visibility ?? DEFAULT_VISIBILITY,
    partType: change.partType,
    contentHash: null,
    partIdHash: partIdHashOf(moduleName, change.name),
    expression: change.expression,
    updatedAtMs: base?.updatedAtMs ?? 0,
  };
}

/**
 * 型チェッカーの型環境に使う最新のパーツ (キーはパーツ ID) に作業中の変更を重ねる.
 * 変更が無ければ渡したものをそのまま返す
 */
export function workingLatestParts(
  committedParts: ReadonlyMap<string, LatestPart>,
  workingChanges: WorkingChanges,
): ReadonlyMap<string, LatestPart> {
  if (workingChanges.parts.size === 0) {
    return committedParts;
  }
  const parts = new Map(committedParts);
  for (const [key, change] of workingChanges.parts) {
    const moduleName = moduleNameOfKey(key);
    const moduleIdBytes = deriveModuleIdBytes(moduleName);
    parts.delete(
      deriveModulePartId(moduleIdBytes, key.slice(moduleName.length + 1)),
    );
    if (change.deleted === true) {
      continue;
    }
    const partId = deriveModulePartId(moduleIdBytes, change.name);
    parts.set(partId, {
      partId,
      moduleId: bytesToUrlSafeBase64NoPad(moduleIdBytes),
      name: change.name,
      partType: change.partType ?? null,
      expression: change.expression ?? null,
      expressionKey: null,
    });
  }
  return parts;
}

/**
 * 作業中の変更のうち型環境に効くもの (名前・型・型パーツの宣言・削除) だけから決まる文字列.
 * 値のパーツの式を書き換えても変わらないので, 型の問い合わせのセッションを作り直すかの判定に使う
 */
export function workingTypeEnvSignature(
  workingChanges: WorkingChanges,
): string {
  return JSON.stringify(
    [...workingChanges.parts].map(([key, change]) => [
      key,
      change.name,
      change.deleted === true,
      change.partType ?? null,
      isTypePartType(change.partType) ? (change.expression ?? null) : null,
    ]),
  );
}

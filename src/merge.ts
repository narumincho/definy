/**
 * ブランチの取り込み (docs/branch.md「取り込み」). 他のブランチの最新のコミットを, 自分のブランチ (main) に
 * パーツごとの 3 方向マージで重ね, 作業中の変更にする. コミットは `merged_commit_hash` に取り込んだコミットを持つ.
 * ブランチはプロジェクトにあるので, パーツはプロジェクトの全モジュールのものを `モジュール名.パーツ名` で並べて扱う
 */
import {
  type LocalizedText,
  DEFAULT_VISIBILITY,
  type Visibility,
} from "./event_content.ts";
import type { PartChange, WorkingChanges } from "./types.ts";

/** 取り込みに使うコミット (親と, 取り込んだコミットと, プロジェクトの全パーツ) */
export type MergeCommit = {
  readonly eventHash: string;
  readonly parentCommitHash: string | null;
  readonly mergedCommitHash: string | null;
  readonly parts: ReadonlyArray<MergePart>;
};

export type MergePart = {
  /** `モジュール名.パーツ名` */
  readonly name: string;
  readonly description: LocalizedText;
  /** 省くと公開 (docs/visibility.md) */
  readonly visibility?: Visibility;
  readonly partType: unknown;
  readonly expression?: unknown;
  readonly contentHash?: string | null;
};

/** 祖先をたどる上限 (読んでいないコミットは 1 件ずつ読むため) */
const MAX_ANCESTORS = 1000;

/** `start` とその祖先 (親と取り込んだコミット) を近い順に */
async function ancestors(
  start: string,
  getCommit: (hash: string) => Promise<MergeCommit | null>,
): Promise<ReadonlyArray<MergeCommit>> {
  const result: MergeCommit[] = [];
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0 && result.length < MAX_ANCESTORS) {
    const hash = queue.shift();
    if (hash === undefined) break;
    const commit = await getCommit(hash);
    if (commit === null) continue;
    result.push(commit);
    for (const next of [commit.parentCommitHash, commit.mergedCommitHash]) {
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return result;
}

/**
 * 2 つのコミットの共通の祖先 (取り込みの基準) のうち `ours` から近いもの. 無ければ `null`.
 * `theirs` が `ours` の祖先なら `theirs` (取り込むものは無い), 逆なら `ours` (早送り)
 */
export async function findMergeBase(
  ours: string,
  theirs: string,
  getCommit: (hash: string) => Promise<MergeCommit | null>,
): Promise<MergeCommit | null> {
  const theirAncestors = new Set(
    (await ancestors(theirs, getCommit)).map((commit) => commit.eventHash),
  );
  for (const commit of await ancestors(ours, getCommit)) {
    if (theirAncestors.has(commit.eventHash)) {
      return commit;
    }
  }
  return null;
}

/** パーツの中身が同じか (名前は比べない) */
function samePart(a: MergePart | undefined, b: MergePart | undefined): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  // 中身の content hash が同じなら中身も同じ (docs/content-addressed.md)
  if (a.contentHash != null && b.contentHash != null) {
    return a.contentHash === b.contentHash;
  }
  return (
    stableJson([
      a.description,
      a.visibility ?? DEFAULT_VISIBILITY,
      a.partType,
      a.expression ?? null,
    ]) ===
    stableJson([
      b.description,
      b.visibility ?? DEFAULT_VISIBILITY,
      b.partType,
      b.expression ?? null,
    ])
  );
}

/** キーの順によらない JSON */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}

type MergeResult = {
  /** 取り込んだ後のパーツ (名前順ではなく, ours の順に theirs で増えたものを足す) */
  readonly parts: ReadonlyArray<MergePart>;
  /** 両方のブランチで違うように変えたパーツ. 取り込む側 (theirs) のものを使う */
  readonly conflicts: ReadonlyArray<string>;
};

/**
 * パーツ名ごとの 3 方向マージ. 基準 (`base`) から片方だけが変えたパーツはその変更を, 両方が同じように変えたものはそれを,
 * 両方が違うように変えたもの (衝突) は取り込む側 (`theirs`) を使う. 無いパーツは削除として扱う
 */
export function mergeParts(
  base: ReadonlyArray<MergePart>,
  ours: ReadonlyArray<MergePart>,
  theirs: ReadonlyArray<MergePart>,
): MergeResult {
  const byName = (parts: ReadonlyArray<MergePart>) =>
    new Map(parts.map((part) => [part.name, part]));
  const baseMap = byName(base);
  const oursMap = byName(ours);
  const theirsMap = byName(theirs);
  const names = [
    ...new Set([...oursMap.keys(), ...theirsMap.keys(), ...baseMap.keys()]),
  ];
  const parts: MergePart[] = [];
  const conflicts: string[] = [];
  for (const name of names) {
    const b = baseMap.get(name);
    const o = oursMap.get(name);
    const t = theirsMap.get(name);
    let merged: MergePart | undefined;
    if (samePart(o, t) || samePart(t, b)) {
      merged = o;
    } else if (samePart(o, b)) {
      merged = t;
    } else {
      conflicts.push(name);
      merged = t;
    }
    if (merged !== undefined) {
      parts.push(merged);
    }
  }
  return { parts, conflicts };
}

/**
 * 取り込んだ後のパーツ (`merged`) を, 今のパーツ (`ours`) への作業中の変更にする.
 * パーツ名もキーも `モジュール名.パーツ名`. 無くなったパーツは削除 (`deleted`) にする
 */
export function mergeToWorkingChanges(
  ours: ReadonlyArray<MergePart>,
  merged: ReadonlyArray<MergePart>,
): ReadonlyMap<string, PartChange> {
  const changes = new Map<string, PartChange>();
  const mergedMap = new Map(merged.map((part) => [part.name, part]));
  const change = (part: MergePart, deleted: boolean): PartChange => {
    const dot = part.name.indexOf(".");
    return {
      moduleDefinitionEventHash: part.name.slice(0, dot),
      partDefinitionEventHash: part.name,
      name: part.name.slice(dot + 1),
      description: part.description,
      visibility: part.visibility ?? DEFAULT_VISIBILITY,
      partType: part.partType,
      expression: part.expression ?? null,
      ...(deleted ? { deleted: true } : {}),
    };
  };
  for (const part of ours) {
    const next = mergedMap.get(part.name);
    if (next === undefined) {
      changes.set(part.name, change(part, true));
    } else if (!samePart(part, next)) {
      changes.set(part.name, change(next, false));
    }
  }
  const oursNames = new Set(ours.map((part) => part.name));
  for (const part of merged) {
    if (!oursNames.has(part.name)) {
      changes.set(part.name, change(part, false));
    }
  }
  return changes;
}

/**
 * プロジェクト `projectName` (モジュール `moduleNames`) に作業中の変更があるか (取り込む前に無いことを確かめる)
 */
export function hasWorkingChangesIn(
  projectName: string,
  moduleNames: ReadonlyArray<string>,
  workingChanges: WorkingChanges,
): boolean {
  return (
    [...workingChanges.parts.keys()].some((partId) =>
      moduleNames.some((name) => partId.startsWith(`${name}.`)),
    ) ||
    [...(workingChanges.newModuleProjects ?? new Map()).values()].includes(
      projectName,
    ) ||
    (workingChanges.merges?.has(projectName) ?? false) ||
    moduleNames.some(
      (name) => workingChanges.moduleVisibilities?.has(name) ?? false,
    )
  );
}

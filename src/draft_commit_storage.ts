/**
 * ドラフトコミット (docs/branch.md「ドラフトコミット」) を localStorage に保存できる
 * JSON 文字列にする. 中身の変更は作業中の変更の保存形式 (docs/value-encoding.md) をそのまま使う
 */
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "./working_changes_storage.ts";
import {
  draftKey,
  emptyWorkingChanges,
  type DraftCommit,
} from "./draft_commits.ts";
import type { WorkingChanges } from "./types.ts";

type PlainDraft = {
  readonly accountId: string;
  readonly projectName: string;
  readonly branch: string;
  readonly baseCommitHash: string | null;
  readonly message: string;
  readonly updatedAtMs: number;
  readonly changes: unknown;
};

function changesToPlain(changes: WorkingChanges): unknown {
  return JSON.parse(serializeWorkingChanges(changes)) as unknown;
}

function changesFromPlain(plain: unknown): WorkingChanges {
  if (typeof plain !== "object" || plain === null) {
    return emptyWorkingChanges();
  }
  return deserializeWorkingChanges(JSON.stringify(plain));
}

export function serializeDrafts(drafts: ReadonlyArray<DraftCommit>): string {
  const plain: PlainDraft[] = drafts.map((draft) => ({
    accountId: draft.accountId,
    projectName: draft.projectName,
    branch: draft.branch,
    baseCommitHash: draft.baseCommitHash,
    message: draft.message,
    updatedAtMs: draft.updatedAtMs,
    changes: changesToPlain(draft.changes),
  }));
  return JSON.stringify({ drafts: plain });
}

/** `serializeDrafts` の結果を復元する. 壊れた JSON のときは空の内容を返す */
export function deserializeDrafts(text: string): ReadonlyArray<DraftCommit> {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return [];
    }
    const rawDrafts = (parsed as { readonly drafts?: unknown }).drafts;
    const drafts: DraftCommit[] = [];
    const seen = new Set<string>();
    if (Array.isArray(rawDrafts)) {
      for (const raw of rawDrafts) {
        if (typeof raw !== "object" || raw === null) continue;
        const d = raw as Partial<PlainDraft>;
        if (
          typeof d.accountId !== "string" ||
          typeof d.projectName !== "string" ||
          typeof d.branch !== "string"
        ) {
          continue;
        }
        const key = draftKey(d.accountId, d.projectName, d.branch);
        if (seen.has(key)) continue;
        seen.add(key);
        drafts.push({
          accountId: d.accountId,
          projectName: d.projectName,
          branch: d.branch,
          baseCommitHash:
            typeof d.baseCommitHash === "string" ? d.baseCommitHash : null,
          message: typeof d.message === "string" ? d.message : "",
          updatedAtMs: typeof d.updatedAtMs === "number" ? d.updatedAtMs : 0,
          changes: changesFromPlain(d.changes),
        });
      }
    }
    return drafts;
  } catch {
    return [];
  }
}

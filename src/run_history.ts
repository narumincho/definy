/**
 * 実行パネルの実行履歴 (docs/run-panel.md). シェルの履歴のように, 実行するたびに新しい記録を足す
 * (同じ式を再実行しても前の記録は書き換えない). 記録はこのブラウザの localStorage にだけ保存する
 */
import type { RunOutcome } from "./run_expression.ts";

export type RunHistoryEntry = {
  /** 記録ごとに一意な番号 (React の key と再実行の対象に使う) */
  readonly id: number;
  /** 実行した式 (`core.expression` の値) */
  readonly expression: unknown;
  readonly ranAtMs: number;
  /** 実行中は `null` */
  readonly outcome: RunOutcome | null;
};

const STORAGE_KEY = "definy.run-history";
/** これより古い記録から消す */
export const MAX_RUN_HISTORY = 100;

/** 実行を始めた記録を先頭に足す (結果はまだ無い). 多すぎたら古いものから消す */
export function addRunEntry(
  history: ReadonlyArray<RunHistoryEntry>,
  entry: Omit<RunHistoryEntry, "outcome">,
): ReadonlyArray<RunHistoryEntry> {
  return [{ ...entry, outcome: null }, ...history].slice(0, MAX_RUN_HISTORY);
}

/** 記録 `id` の結果を入れる (I/O の途中経過で何度も呼んでよい) */
export function setRunOutcome(
  history: ReadonlyArray<RunHistoryEntry>,
  id: number,
  outcome: RunOutcome,
): ReadonlyArray<RunHistoryEntry> {
  return history.map((entry) =>
    entry.id === id ? { ...entry, outcome } : entry,
  );
}

function isRunHistoryEntry(value: unknown): value is RunHistoryEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "number" &&
    typeof (value as { ranAtMs?: unknown }).ranAtMs === "number" &&
    "expression" in value
  );
}

/**
 * 保存した履歴を読む. 読めないとき (保存できない環境, 壊れた JSON) は空.
 * 実行中のまま保存された記録 (途中でページを閉じた) は結果が分からないので中断にする
 */
export function loadRunHistory(): ReadonlyArray<RunHistoryEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const json: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(json)
      ? json.filter(isRunHistoryEntry).map((entry) =>
          entry.outcome === null
            ? {
                ...entry,
                outcome: { kind: "error", message: "interrupted" } as const,
              }
            : entry,
        )
      : [];
  } catch {
    return [];
  }
}

export function saveRunHistory(history: ReadonlyArray<RunHistoryEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // 保存できない環境 (プライベートモードなど) では保存しない
  }
}

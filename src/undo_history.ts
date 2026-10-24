/**
 * 元に戻す (Undo) / やり直す (Redo) の履歴. DOM や React に依存しない純粋な関数にしてテストできるようにしている.
 * 値そのもの (パーツ詳細ならそのパーツの作業中の変更) を変更の前ごとに積む
 */

/** 履歴に残す変更の数の上限. 超えたら古いものから捨てる */
export const UNDO_HISTORY_LIMIT = 200;

/**
 * 同じ `mergeKey` の変更がこの時間 (ミリ秒) 以内に続いたら 1 つの変更にまとめる.
 * 入力欄に 1 文字打つごとに履歴が積まれないようにするため
 */
export const UNDO_MERGE_WINDOW_MS = 1000;

export type UndoHistory<T> = {
  /** 古い順. 最後が 1 つ前の値 */
  readonly past: ReadonlyArray<T>;
  /** 元に戻した値. 最後が次にやり直す値 */
  readonly future: ReadonlyArray<T>;
  readonly lastMergeKey: string | null;
  readonly lastChangedAtMs: number;
};

export function emptyUndoHistory<T>(): UndoHistory<T> {
  return { past: [], future: [], lastMergeKey: null, lastChangedAtMs: 0 };
}

/**
 * 値を変える前に呼び, 変える前の値 `before` を積む. やり直しの履歴は消える.
 * `mergeKey` が直前の変更と同じで {@link UNDO_MERGE_WINDOW_MS} 以内なら, 新しく積まずに直前の変更にまとめる
 * (文字列の入力など. `null` ならまとめない)
 */
export function recordUndo<T>(
  history: UndoHistory<T>,
  before: T,
  mergeKey: string | null,
  nowMs: number,
): UndoHistory<T> {
  const merge =
    mergeKey !== null &&
    mergeKey === history.lastMergeKey &&
    nowMs - history.lastChangedAtMs <= UNDO_MERGE_WINDOW_MS &&
    history.past.length > 0;
  return {
    past: merge
      ? history.past
      : [...history.past, before].slice(-UNDO_HISTORY_LIMIT),
    future: [],
    lastMergeKey: mergeKey,
    lastChangedAtMs: nowMs,
  };
}

/** 1 つ前の値に戻す. 戻せなければ `null`. 今の値 `current` はやり直しの履歴に積む */
export function undo<T>(
  history: UndoHistory<T>,
  current: T,
): { readonly history: UndoHistory<T>; readonly value: T } | null {
  if (history.past.length === 0) {
    return null;
  }
  const value = history.past[history.past.length - 1] as T;
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      lastMergeKey: null,
      lastChangedAtMs: 0,
    },
    value,
  };
}

/** 元に戻した値をやり直す. やり直せなければ `null`. 今の値 `current` は元に戻す履歴に積む */
export function redo<T>(
  history: UndoHistory<T>,
  current: T,
): { readonly history: UndoHistory<T>; readonly value: T } | null {
  if (history.future.length === 0) {
    return null;
  }
  const value = history.future[history.future.length - 1] as T;
  return {
    history: {
      past: [...history.past, current],
      future: history.future.slice(0, -1),
      lastMergeKey: null,
      lastChangedAtMs: 0,
    },
    value,
  };
}

export type UndoKey = "undo" | "redo";

/**
 * キー入力を元に戻す / やり直すに変換する. Ctrl / Cmd + Z で元に戻す,
 * Ctrl / Cmd + Shift + Z と Ctrl + Y でやり直す
 */
export function undoKeyFromEvent(e: {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}): UndoKey | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) {
    return null;
  }
  const key = e.key.toLowerCase();
  if (key === "z") {
    return e.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && e.ctrlKey && !e.shiftKey) {
    return "redo";
  }
  return null;
}

import { describe, expect, it } from "vitest";
import {
  UNDO_HISTORY_LIMIT,
  UNDO_MERGE_WINDOW_MS,
  emptyUndoHistory,
  recordUndo,
  redo,
  undo,
  undoKeyFromEvent,
  type UndoHistory,
} from "./undo_history.ts";

/** 値を `values` の順に変えた履歴. 最後の値が今の値 */
function historyOf(
  values: ReadonlyArray<string>,
  mergeKey: string | null = null,
  stepMs = UNDO_MERGE_WINDOW_MS + 1,
): UndoHistory<string> {
  let history = emptyUndoHistory<string>();
  for (const [i, value] of values.slice(0, -1).entries()) {
    history = recordUndo(history, value, mergeKey, (i + 1) * stepMs);
  }
  return history;
}

describe("undo / redo", () => {
  it("変える前の値に戻し, やり直せる", () => {
    const history = historyOf(["a", "b", "c"]);
    const undone = undo(history, "c");
    expect(undone?.value).toBe("b");
    const undoneTwice = undo(undone?.history ?? history, "b");
    expect(undoneTwice?.value).toBe("a");
    expect(undo(undoneTwice?.history ?? history, "a")).toBeNull();
    const redone = redo(undoneTwice?.history ?? history, "a");
    expect(redone?.value).toBe("b");
    expect(redo(redone?.history ?? history, "b")?.value).toBe("c");
  });

  it("元に戻した後に変えると, やり直しの履歴は消える", () => {
    const undone = undo(historyOf(["a", "b"]), "b");
    const changed = recordUndo(
      undone?.history ?? emptyUndoHistory(),
      "a",
      null,
      10_000,
    );
    expect(redo(changed, "x")).toBeNull();
    expect(undo(changed, "x")?.value).toBe("a");
  });

  it("同じ mergeKey の変更が続けば 1 つにまとめる", () => {
    const typed = historyOf(["", "a", "ab", "abc"], "text:name", 100);
    expect(typed.past).toEqual([""]);
    expect(undo(typed, "abc")?.value).toBe("");
  });

  it("間が空いたり mergeKey が違ったりすればまとめない", () => {
    expect(historyOf(["", "a", "ab"], "text:name").past).toEqual(["", "a"]);
    let history = recordUndo(emptyUndoHistory<string>(), "", "name", 0);
    history = recordUndo(history, "a", "description", 10);
    expect(history.past).toEqual(["", "a"]);
    // mergeKey が null の変更はまとめない
    history = recordUndo(history, "b", null, 20);
    history = recordUndo(history, "c", null, 30);
    expect(history.past).toEqual(["", "a", "b", "c"]);
  });

  it("元に戻した直後の入力は, 前の入力とまとめない", () => {
    const typed = historyOf(["", "a"], "text:name", 10);
    const undone = undo(typed, "a");
    const retyped = recordUndo(undone?.history ?? typed, "", "text:name", 20);
    expect(retyped.past).toEqual([""]);
  });

  it("上限を超えたら古いものから捨てる", () => {
    let history = emptyUndoHistory<number>();
    for (let i = 0; i < UNDO_HISTORY_LIMIT + 5; i += 1) {
      history = recordUndo(history, i, null, i);
    }
    expect(history.past).toHaveLength(UNDO_HISTORY_LIMIT);
    expect(history.past[0]).toBe(5);
  });
});

describe("undoKeyFromEvent", () => {
  const key = (
    k: string,
    modifiers: Partial<{
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      altKey: boolean;
    }> = {},
  ) =>
    undoKeyFromEvent({
      key: k,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      ...modifiers,
    });

  it("Ctrl / Cmd + Z で元に戻す, Shift 付きと Ctrl + Y でやり直す", () => {
    expect(key("z", { ctrlKey: true })).toBe("undo");
    expect(key("z", { metaKey: true })).toBe("undo");
    expect(key("Z", { metaKey: true, shiftKey: true })).toBe("redo");
    expect(key("y", { ctrlKey: true })).toBe("redo");
  });

  it("修飾キーが無い・Alt 付きは対象外", () => {
    expect(key("z")).toBeNull();
    expect(key("z", { ctrlKey: true, altKey: true })).toBeNull();
    expect(key("y", { metaKey: true })).toBeNull();
  });
});

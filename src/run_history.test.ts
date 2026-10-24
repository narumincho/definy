import { describe, expect, it } from "vitest";
import {
  addRunEntry,
  MAX_RUN_HISTORY,
  setRunOutcome,
  type RunHistoryEntry,
} from "./run_history.ts";

describe("run history", () => {
  it("新しい記録を先頭に足し, 結果を後から入れる", () => {
    const history = addRunEntry(
      addRunEntry([], { id: 1, expression: { "#number": 1 }, ranAtMs: 10 }),
      { id: 2, expression: { "#number": 2 }, ranAtMs: 20 },
    );
    expect(history.map((e) => e.id)).toEqual([2, 1]);
    expect(history[0]?.outcome).toBeNull();

    const done = setRunOutcome(history, 1, {
      kind: "value",
      value: 1,
      wasiIo: null,
    });
    expect(done[1]?.outcome).toEqual({ kind: "value", value: 1, wasiIo: null });
    expect(done[0]?.outcome).toBeNull();
  });

  it("多すぎたら古い記録から消す", () => {
    let history: ReadonlyArray<RunHistoryEntry> = [];
    for (let id = 1; id <= MAX_RUN_HISTORY + 5; id++) {
      history = addRunEntry(history, { id, expression: null, ranAtMs: id });
    }
    expect(history).toHaveLength(MAX_RUN_HISTORY);
    expect(history[0]?.id).toBe(MAX_RUN_HISTORY + 5);
    expect(history.at(-1)?.id).toBe(6);
  });
});

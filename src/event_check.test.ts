import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { checkEvent, eventRejectionMessage } from "./event_check.ts";
import type { CommitPart, EventContent } from "./event_content.ts";

const checker = new WebAssembly.Module(
  await readFile("wasm/event_checker.wasm"),
);

const part = (name: string): CommitPart => ({
  name,
  description: [],
  partType: { "#number": null },
  expression: { "#number": 1 },
  contentHash: null,
});

const commit = (
  moduleName: string,
  parentCommitHash: string | null,
  parts: ReadonlyArray<CommitPart>,
): EventContent => ({
  type: "module_commit",
  commit: {
    moduleName,
    moduleDescription: [],
    message: "m",
    parentCommitHash,
    parts,
  },
});

const tags = (
  content: EventContent,
  state: Parameters<typeof checkEvent>[2],
): ReadonlyArray<string> =>
  checkEvent(checker, content, state).map(
    (rejection) =>
      rejection.tag +
      (rejection.payload === null ? "" : `:${String(rejection.payload)}`),
  );

describe("core.check-event", () => {
  it("アカウントは 1 度だけ, 空でない名前で作れる", () => {
    const create: EventContent = {
      type: "create_account",
      accountName: "alice",
    };
    expect(
      tags(create, { accountCreated: false, latestCommitHash: null }),
    ).toEqual([]);
    expect(
      tags(create, { accountCreated: true, latestCommitHash: null }),
    ).toEqual(["account_already_created"]);
    expect(
      tags(
        { type: "create_account", accountName: "" },
        { accountCreated: false, latestCommitHash: null },
      ),
    ).toEqual(["empty_account_name"]);
  });

  it("モジュールのコミットは, アカウントを作ってから最新のコミットを親にする", () => {
    expect(
      tags(commit("math", null, [part("a")]), {
        accountCreated: true,
        latestCommitHash: null,
      }),
    ).toEqual([]);
    expect(
      tags(commit("math", "h1", [part("a")]), {
        accountCreated: true,
        latestCommitHash: "h1",
      }),
    ).toEqual([]);
    expect(
      tags(commit("math", "h0", [part("a")]), {
        accountCreated: false,
        latestCommitHash: "h1",
      }),
    ).toEqual(["account_not_created", "parent_commit_mismatch"]);
    // 新しいモジュールに親を付けた・既存のモジュールに親を付けなかった
    expect(
      tags(commit("math", "h0", []), {
        accountCreated: true,
        latestCommitHash: null,
      }),
    ).toEqual(["parent_commit_mismatch"]);
    expect(
      tags(commit("math", null, []), {
        accountCreated: true,
        latestCommitHash: "h1",
      }),
    ).toEqual(["parent_commit_mismatch"]);
  });

  it("モジュール名・パーツ名は空にできず, パーツ名は重複できない", () => {
    expect(
      tags(commit("", null, [part("a"), part(""), part("b"), part("a")]), {
        accountCreated: true,
        latestCommitHash: null,
      }),
    ).toEqual([
      "empty_module_name",
      "empty_part_name",
      "duplicate_part_name:a",
    ]);
  });

  it("理由をメッセージにする", () => {
    expect(
      eventRejectionMessage({ tag: "duplicate_part_name", payload: "a" }),
    ).toBe("the part name 'a' is duplicated");
  });
});

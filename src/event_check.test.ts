import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkEvent,
  eventRejectionMessage,
  NO_MODULE_STATE,
  type EventCheckState,
} from "./event_check.ts";
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

const commit = (options: {
  readonly moduleName?: string;
  readonly branch?: string;
  readonly parent?: string | null;
  readonly merged?: string | null;
  readonly parts?: ReadonlyArray<CommitPart>;
}): EventContent => ({
  type: "module_commit",
  commit: {
    moduleName: options.moduleName ?? "math",
    branch: options.branch ?? "main",
    moduleDescription: [],
    message: "m",
    parentCommitHash: options.parent ?? null,
    mergedCommitHash: options.merged ?? null,
    parts: options.parts ?? [part("a")],
  },
});

/** アカウントを作っていて, モジュールにまだコミットが無い状態 */
const fresh: EventCheckState = { accountCreated: true, ...NO_MODULE_STATE };

const tags = (
  content: EventContent,
  state: EventCheckState,
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
    expect(tags(create, { ...fresh, accountCreated: false })).toEqual([]);
    expect(tags(create, fresh)).toEqual(["account_already_created"]);
    expect(
      tags(
        { type: "create_account", accountName: "" },
        { ...fresh, accountCreated: false },
      ),
    ).toEqual(["empty_account_name"]);
  });

  it("モジュールの最初のコミットは親の無い main で, アカウントを作ってから", () => {
    expect(tags(commit({}), fresh)).toEqual([]);
    expect(tags(commit({}), { ...fresh, accountCreated: false })).toEqual([
      "account_not_created",
    ]);
    expect(tags(commit({ branch: "dev", parent: "h0" }), fresh)).toEqual([
      "first_branch_must_be_main",
      "parent_commit_mismatch",
    ]);
  });

  it("ブランチには作成者だけが, 最新のコミットを親にしてコミットできる", () => {
    const onBranch: EventCheckState = {
      ...fresh,
      branchLatestCommitHash: "h1",
      isBranchCreator: true,
      moduleHasCommits: true,
      parentInModule: true,
    };
    expect(tags(commit({ parent: "h1" }), onBranch)).toEqual([]);
    expect(
      tags(commit({ parent: "h1" }), { ...onBranch, isBranchCreator: false }),
    ).toEqual(["not_branch_creator"]);
    expect(tags(commit({ parent: "h0" }), onBranch)).toEqual([
      "parent_commit_mismatch",
    ]);
    expect(tags(commit({ parent: null }), onBranch)).toEqual([
      "parent_commit_mismatch",
    ]);
  });

  it("新しいブランチは誰でも, モジュールのコミットを親にして作れる", () => {
    const newBranch: EventCheckState = {
      ...fresh,
      moduleHasCommits: true,
      parentInModule: true,
    };
    expect(tags(commit({ branch: "alice", parent: "h1" }), newBranch)).toEqual(
      [],
    );
    expect(
      tags(commit({ branch: "alice", parent: null }), {
        ...newBranch,
        parentInModule: false,
      }),
    ).toEqual(["parent_commit_mismatch"]);
  });

  it("他のブランチの取り込みは, 同じモジュールのコミットを取り込む", () => {
    const onMain: EventCheckState = {
      ...fresh,
      branchLatestCommitHash: "h1",
      isBranchCreator: true,
      moduleHasCommits: true,
      parentInModule: true,
    };
    expect(
      tags(commit({ parent: "h1", merged: "b1" }), {
        ...onMain,
        mergedInModule: true,
      }),
    ).toEqual([]);
    expect(tags(commit({ parent: "h1", merged: "x" }), onMain)).toEqual([
      "merged_commit_not_in_module",
    ]);
  });

  it("モジュール名・ブランチ名・パーツ名は空にできず, パーツ名は重複できない", () => {
    expect(
      tags(
        commit({
          moduleName: "",
          parts: [part("a"), part(""), part("b"), part("a")],
        }),
        fresh,
      ),
    ).toEqual([
      "empty_module_name",
      "empty_part_name",
      "duplicate_part_name:a",
    ]);
    expect(tags(commit({ branch: "" }), fresh)).toEqual([
      "empty_branch_name",
      "first_branch_must_be_main",
    ]);
  });

  it("理由をメッセージにする", () => {
    expect(
      eventRejectionMessage({ tag: "duplicate_part_name", payload: "a" }),
    ).toBe("the part name 'a' is duplicated");
  });
});

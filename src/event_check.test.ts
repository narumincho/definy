import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkEvent,
  conformsInDefiny,
  eventRejectionMessage,
  type CommitSummary,
  type EventCheckFacts,
} from "./event_check.ts";
import {
  encodeEventContent,
  encodePartContent,
  isEventContent,
  isPartContent,
  type CommitModule,
  type CommitPart,
  type EventContent,
} from "./event_content.ts";

const checker = new WebAssembly.Module(
  await readFile("wasm/event_checker.wasm"),
);
const shapeChecker = new WebAssembly.Module(
  await readFile("wasm/shape_checker.wasm"),
);

const part = (name: string): CommitPart => ({
  name,
  description: [],
  partType: null,
  expression: null,
  contentHash: `hash-${name}`,
});

const module = (
  name: string,
  parts: ReadonlyArray<CommitPart> = [part("a")],
): CommitModule => ({ name, description: [], parts });

const commit = (options: {
  readonly projectName?: string;
  readonly branch?: string;
  readonly parent?: string | null;
  readonly merged?: string | null;
  readonly modules?: ReadonlyArray<CommitModule>;
}): EventContent => ({
  type: "project_commit",
  commit: {
    projectName: options.projectName ?? "math",
    branch: options.branch ?? "main",
    projectDescription: [],
    message: "m",
    parentCommitHash: options.parent ?? null,
    mergedCommitHash: options.merged ?? null,
    modules: options.modules ?? [module("math")],
  },
});

/** アカウント `me` を作っていて, どのプロジェクトにもまだコミットが無い */
const fresh: EventCheckFacts = {
  accountId: "me",
  accountCreated: true,
  commits: [],
};

/** 受け付けたコミット (既定はプロジェクト math の main に `me` が時刻 1 でしたもの) */
const accepted = (
  eventHash: string,
  options: Partial<Omit<CommitSummary, "eventHash">> = {},
): CommitSummary => ({
  eventHash,
  accountId: "me",
  projectName: "math",
  branch: "main",
  timeMs: 1,
  moduleNames: ["math"],
  ...options,
});

const tags = (
  content: EventContent,
  facts: EventCheckFacts,
): ReadonlyArray<string> =>
  checkEvent(checker, content, facts).map(
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

  it("プロジェクトの最初のコミットは親の無い main で, アカウントを作ってから", () => {
    expect(tags(commit({}), fresh)).toEqual([]);
    expect(tags(commit({}), { ...fresh, accountCreated: false })).toEqual([
      "account_not_created",
    ]);
    expect(tags(commit({ branch: "dev", parent: "h0" }), fresh)).toEqual([
      "first_branch_must_be_main",
      "parent_commit_mismatch",
    ]);
  });

  it("ブランチには作成者 (最初のコミットのアカウント) だけが, 最新のコミットを親にしてコミットできる", () => {
    const onBranch: EventCheckFacts = {
      ...fresh,
      commits: [
        accepted("h1", { timeMs: 2 }),
        accepted("h0", { timeMs: 1 }),
        // 他のアカウントがこのブランチにコミットしていても作成者は変わらない
        accepted("x", { accountId: "other", branch: "other" }),
      ],
    };
    expect(tags(commit({ parent: "h1" }), onBranch)).toEqual([]);
    expect(
      tags(commit({ parent: "h1" }), { ...onBranch, accountId: "other" }),
    ).toEqual(["not_branch_creator"]);
    expect(tags(commit({ parent: "h0" }), onBranch)).toEqual([
      "parent_commit_mismatch",
    ]);
    expect(tags(commit({ parent: null }), onBranch)).toEqual([
      "parent_commit_mismatch",
    ]);
    // 同じ時刻なら先に受け付けたものが最新のまま
    expect(
      tags(commit({ parent: "h1" }), {
        ...fresh,
        commits: [accepted("h1"), accepted("h2")],
      }),
    ).toEqual([]);
  });

  it("新しいブランチは誰でも, プロジェクトのコミットを親にして作れる", () => {
    const newBranch: EventCheckFacts = {
      ...fresh,
      commits: [accepted("h1", { accountId: "other" })],
    };
    expect(tags(commit({ branch: "alice", parent: "h1" }), newBranch)).toEqual(
      [],
    );
    expect(tags(commit({ branch: "alice", parent: null }), newBranch)).toEqual([
      "parent_commit_mismatch",
    ]);
    // 他のプロジェクトのコミットは親にできない
    expect(
      tags(commit({ branch: "alice", parent: "h1" }), {
        ...fresh,
        commits: [accepted("h1", { projectName: "other", moduleNames: [] })],
      }),
    ).toEqual(["first_branch_must_be_main", "parent_commit_mismatch"]);
  });

  it("他のブランチの取り込みは, 同じプロジェクトのコミットを取り込む", () => {
    const onMain: EventCheckFacts = {
      ...fresh,
      commits: [
        accepted("h1"),
        accepted("b1", { accountId: "bob", branch: "bob" }),
        accepted("o1", { projectName: "other", moduleNames: [] }),
      ],
    };
    expect(tags(commit({ parent: "h1", merged: "b1" }), onMain)).toEqual([]);
    expect(tags(commit({ parent: "h1", merged: "x" }), onMain)).toEqual([
      "merged_commit_not_in_project",
    ]);
    expect(tags(commit({ parent: "h1", merged: "o1" }), onMain)).toEqual([
      "merged_commit_not_in_project",
    ]);
  });

  it("プロジェクト名・ブランチ名・パーツ名は空にできず, パーツ名はモジュールの中で重複できない", () => {
    expect(
      tags(
        commit({
          projectName: "",
          modules: [
            module("math", [part("a"), part(""), part("b"), part("a")]),
            module("other", [part("a")]),
          ],
        }),
        fresh,
      ),
    ).toEqual([
      "empty_project_name",
      "empty_part_name",
      "duplicate_part_name:a",
    ]);
    expect(tags(commit({ branch: "" }), fresh)).toEqual([
      "empty_branch_name",
      "first_branch_must_be_main",
    ]);
  });

  it("モジュール名は空にできず, 重複できず, 他のプロジェクトのものは使えない", () => {
    expect(
      tags(
        commit({
          modules: [
            module("math"),
            module(""),
            module("math"),
            module("core"),
            module("std"),
          ],
        }),
        {
          ...fresh,
          commits: [
            accepted("d2", {
              projectName: "definy",
              timeMs: 2,
              moduleNames: ["core"],
            }),
            // 他のプロジェクトの古いコミットのモジュールは使える
            accepted("d1", {
              projectName: "definy",
              timeMs: 1,
              moduleNames: ["core", "std"],
            }),
          ],
        },
      ),
    ).toEqual([
      "empty_module_name",
      "duplicate_module_name:math",
      "module_in_other_project:core",
    ]);
    // モジュールの無いプロジェクトも作れる
    expect(tags(commit({ modules: [] }), fresh)).toEqual([]);
  });

  it("中身の形は definy 製の core.value-conforms で確かめ, TypeScript の検査と同じ結果になる", () => {
    const samples: ReadonlyArray<readonly [string, unknown]> = [
      ["core.event-content", encodeEventContent(commit({}))],
      [
        "core.event-content",
        encodeEventContent({ type: "create_account", accountName: "a" }),
      ],
      ["core.event-content", { "#create_account": { account_name: 1 } }],
      ["core.event-content", { "#create_account": {} }],
      [
        "core.event-content",
        { "#create_account": { account_name: "a", extra: true } },
      ],
      ["core.event-content", { "#delete_account": null }],
      ["core.event-content", { CreateAccount: { account_name: "a" } }],
      ["core.event-content", [1, 2]],
      [
        "core.part-content",
        encodePartContent({
          description: [{ language: "en", text: "x" }],
          visibility: "private",
          partType: { "#type_number": null },
          expression: {
            "#call": {
              function: { "#variable": { variable_id: 0 } },
              arguments: [{ name: "a", value: { "#number": 1 } }],
            },
          },
        }),
      ],
      [
        "core.part-content",
        encodePartContent({
          description: [],
          partType: null,
          expression: { "#number": 1.5 },
        }),
      ],
      [
        "core.part-content",
        encodePartContent({
          description: [],
          partType: null,
          expression: { "#nope": 1 },
        }),
      ],
    ];
    const typescript = (typeName: string, value: unknown) =>
      typeName === "core.event-content"
        ? isEventContent(value)
        : isPartContent(value);
    expect(
      samples.map(([typeName, value]) =>
        conformsInDefiny(shapeChecker, value, typeName),
      ),
    ).toEqual(samples.map(([typeName, value]) => typescript(typeName, value)));
    expect(
      samples.map(([typeName, value]) =>
        conformsInDefiny(shapeChecker, value, typeName),
      ),
    ).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("理由をメッセージにする", () => {
    expect(
      eventRejectionMessage({ tag: "duplicate_part_name", payload: "a" }),
    ).toBe("the part name 'a' is duplicated");
    expect(
      eventRejectionMessage({
        tag: "module_in_other_project",
        payload: "core",
      }),
    ).toBe("the module 'core' belongs to another project");
  });
});

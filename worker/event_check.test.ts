import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  type AccountCredentials,
  type SignedProjectCommitResult,
} from "../src/auth.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { latestCommitHashOf } from "./type_check.ts";
import type { Env, GetProjectBranchesResponse } from "./types.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";

/** イベントを出す. プロジェクトのコミットなら先にパーツの中身を CAS に入れる */
async function submit(
  store: WorkerStore,
  env: Env,
  signed: string | SignedProjectCommitResult,
): Promise<{ readonly status: number; readonly message: string }> {
  if (typeof signed !== "string") {
    await store.uploadContent([...signed.contents.values()], env);
  }
  const signedEventBytes =
    typeof signed === "string" ? signed : signed.signedEventBytes;
  const res = await handleWorkerRequest(
    new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEventBytes }),
    }),
    env,
    store,
  );
  const json = (await res.json()) as { readonly message?: string };
  return { status: res.status, message: json.message ?? "" };
}

describe("SubmitEvent のブランチの規則 (core.check-event)", () => {
  it("ブランチには作成者だけがコミットでき, 誰でもプロジェクトのコミットから新しいブランチを作れる", async () => {
    const store = new WorkerStore();
    const db = createSqliteD1Database();
    await store.seedD1(db, await loadTestSeedBundle());
    const env: Env = { DB: db };
    const alice = await generateAccountCredentials("alice");
    const bob = await generateAccountCredentials("bob");
    for (const credentials of [alice, bob]) {
      expect(
        (
          await submit(
            store,
            env,
            (await createSignedAccountEvent(credentials)).signedEventBytes,
          )
        ).status,
      ).toBe(200);
    }
    // 同じ秒に続けてコミットしても順番が決まるように, 時刻を 1 秒ずつ進める
    let time = Math.floor(Date.now() / 1000) - 100;
    const commit = async (
      credentials: AccountCredentials,
      branch: string,
      parentCommitHash: string | null,
      value: number,
    ) =>
      submit(
        store,
        env,
        await createSignedSingleModuleCommitEvent(
          {
            credentials,
            moduleName: "app",
            branch,
            moduleDescription: [],
            message: "test",
            parentCommitHash,
            parts: [
              {
                name: "answer",
                description: [],
                partType: { "#number": null },
                expression: { "#number": value },
              },
            ],
          },
          (time += 1),
        ),
      );
    const head = async (branch: string) =>
      latestCommitHashOf("app", store, env, branch);

    // プロジェクトの最初のコミットは main (alice が作成者になる)
    expect((await commit(alice, "feature", null, 1)).message).toContain(
      "main branch",
    );
    expect((await commit(alice, "main", null, 1)).status).toBe(200);
    const main1 = await head("main");
    // bob は alice の main にはコミットできない
    const rejected = await commit(bob, "main", main1, 2);
    expect(rejected.status).toBe(400);
    expect(rejected.message).toContain("created the branch");
    // bob は main のコミットから自分のブランチを作り, 続けてコミットできる
    expect((await commit(bob, "bob", main1, 2)).status).toBe(200);
    expect((await commit(bob, "bob", await head("bob"), 3)).status).toBe(200);
    // 親が最新でないコミットは拒否する
    expect((await commit(bob, "bob", main1, 4)).status).toBe(400);
    // alice は bob のブランチにはコミットできない. main は alice のまま
    expect((await commit(alice, "bob", await head("bob"), 5)).status).toBe(400);
    expect((await commit(alice, "main", main1, 6)).status).toBe(200);

    // GetProjectBranches は各ブランチの作成者・コミット数・最新のコミットのイベントを返す (seed のプロジェクトも)
    const res = await handleWorkerRequest(
      new Request(
        "https://definy.local/definy.v1.EventService/GetProjectBranches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      ),
      env,
      store,
    );
    expect(res.status).toBe(200);
    const { branches } = (await res.json()) as GetProjectBranchesResponse;
    const app = branches
      .filter((b) => b.projectName === "app")
      .map((b) => ({
        branch: b.branch,
        creatorAccountId: b.creatorAccountId,
        commitCount: b.commitCount,
        latestEventHash: b.latestEvent.eventHash,
      }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
    expect(app).toEqual([
      {
        branch: "bob",
        creatorAccountId: bob.accountId,
        commitCount: 2,
        latestEventHash: await head("bob"),
      },
      {
        branch: "main",
        creatorAccountId: alice.accountId,
        commitCount: 2,
        latestEventHash: await head("main"),
      },
    ]);
    expect(
      branches.some((b) => b.projectName === "definy" && b.branch === "main"),
    ).toBe(true);
  }, 60_000);

  it("他のプロジェクトのモジュールの名前は使えない", async () => {
    const store = new WorkerStore();
    const db = createSqliteD1Database();
    await store.seedD1(db, await loadTestSeedBundle());
    const env: Env = { DB: db };
    const alice = await generateAccountCredentials("alice");
    expect(
      (
        await submit(
          store,
          env,
          (await createSignedAccountEvent(alice)).signedEventBytes,
        )
      ).status,
    ).toBe(200);
    const commit = async (projectName: string, moduleName: string) =>
      submit(
        store,
        env,
        await createSignedSingleModuleCommitEvent({
          credentials: alice,
          projectName,
          moduleName,
          moduleDescription: [],
          message: "test",
          parts: [
            {
              name: "answer",
              description: [],
              partType: { "#number": null },
              expression: { "#number": 1 },
            },
          ],
        }),
      );
    // core は seed の definy プロジェクトのモジュール
    const rejected = await commit("mine", "core");
    expect(rejected.status).toBe(400);
    expect(rejected.message).toContain("belongs to another project");
    expect((await commit("mine", "mine")).status).toBe(200);
  }, 60_000);
});

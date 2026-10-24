import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  createSignedModuleCommitEvent,
  generateAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import { deriveModuleIdBytes } from "./cbor.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { latestCommitHashOf } from "./type_check.ts";
import type { Env } from "./types.ts";

async function submit(
  store: WorkerStore,
  env: Env,
  signedEventBytes: string,
): Promise<{ readonly status: number; readonly message: string }> {
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
  it("ブランチには作成者だけがコミットでき, 誰でもモジュールのコミットから新しいブランチを作れる", async () => {
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
        (
          await createSignedModuleCommitEvent(
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
          )
        ).signedEventBytes,
      );
    const head = async (branch: string) =>
      latestCommitHashOf(await deriveModuleIdBytes("app"), store, env, branch);

    // モジュールの最初のコミットは main (alice が作成者になる)
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
  }, 60_000);
});

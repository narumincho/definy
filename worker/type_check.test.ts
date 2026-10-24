import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  createSignedModuleCommitEvent,
  generateAccountCredentials,
  importAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import { bytesToUrlSafeBase64NoPad, type DecodedPart } from "../src/cbor.ts";
import { resolvePartPlaceholders } from "../src/seed_parts.ts";
import { DEV_SYSTEM_KEY_SEED } from "../src/system_account.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { latestCommitHashOf } from "./type_check.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";

async function createSeededStore(): Promise<{
  readonly store: WorkerStore;
  readonly env: Env;
}> {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  return { store, env: { DB: db } };
}

async function submitEvent(
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

/**
 * アカウントを作っていなければ作ってから, モジュールの最新のコミットを親にしてコミットする
 * (イベントを受け付ける規則 core.check-event. docs/event.md)
 */
async function submitCommit(
  store: WorkerStore,
  env: Env,
  credentials: AccountCredentials,
  moduleName: string,
  parts: ReadonlyArray<DecodedPart>,
): Promise<{ readonly status: number; readonly message: string }> {
  const accounts = await store.getEvents(
    { eventType: "create_account", limit: 500 },
    env,
  );
  if (!accounts.some((item) => item.accountId === credentials.accountId)) {
    expect(
      await submitEvent(
        store,
        env,
        (await createSignedAccountEvent(credentials)).signedEventBytes,
      ),
    ).toEqual({ status: 200, message: "" });
  }
  const commit = await createSignedModuleCommitEvent({
    credentials,
    moduleName,
    moduleDescription: [],
    message: "test",
    parentCommitHash: await latestCommitHashOf(
      await deriveModuleIdBytes(moduleName),
      store,
      env,
    ),
    parts,
  });
  return submitEvent(store, env, commit.signedEventBytes);
}

function part(
  name: string,
  partType: unknown,
  expression: unknown,
): DecodedPart {
  return { name, description: [], partType, expression };
}

async function partReference(
  accountId: string,
  moduleName: string,
  partName: string,
): Promise<unknown> {
  return {
    "#part_reference": {
      part_definition_event_hash: await deriveModulePartId(
        await deriveModuleIdBytes(moduleName),
        partName,
      ),
    },
  };
}

describe("SubmitEvent の型検査", () => {
  it("型の合うコミットは受け付ける (他のモジュールのパーツの呼び出しも引数の型まで検査する)", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const result = await submitCommit(store, env, user, "app", [
      part("answer", { "#number": null }, { "#number": 42 }),
      part(
        "contains",
        { "#boolean": null },
        {
          "#call": {
            function: await partReference(
              system.accountId,
              "core",
              "list-contains-string",
            ),
            arguments: [
              {
                name: "list",
                value: { "#list": [{ "#string": "a" }] },
              },
              { name: "target", value: { "#string": "a" } },
              { name: "index", value: { "#number": 0 } },
            ],
          },
        },
      ),
    ]);
    expect(result).toEqual({ status: 200, message: "" });
  });

  it("型エラーのあるコミットは 400 で拒否し, パーツ名と理由を返す", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const result = await submitCommit(store, env, user, "app", [
      part("ok", { "#number": null }, { "#number": 1 }),
      part("bad", { "#number": null }, { "#string": "not a number" }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'bad': type error: type_mismatch");
    expect(result.message).not.toContain("part 'ok'");
  });

  it("型の無いパーツは一般のアカウントでは拒否する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const result = await submitCommit(store, env, user, "app", [
      part("untyped", null, { "#number": 1 }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'untyped': not supported");
  });

  it("パーツの型を変えると, それを参照する (式を変えていない) パーツも検査する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const base = part("base", { "#number": null }, { "#number": 1 });
    const double = part(
      "double",
      { "#number": null },
      {
        "#call": {
          function: await resolvePartPlaceholders({
            "#part_reference": {
              part_definition_event_hash: { $part: "core.plus" },
            },
          }),
          arguments: [
            {
              name: "left",
              value: await partReference(user.accountId, "app", "base"),
            },
            { name: "right", value: { "#number": 1 } },
          ],
        },
      },
    );
    expect(
      (await submitCommit(store, env, user, "app", [base, double])).status,
    ).toBe(200);
    const result = await submitCommit(store, env, user, "app", [
      part("base", { "#string": null }, { "#string": "one" }),
      double,
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'double': type error");
  });

  it("コンパイラ組み込みのパーツは名前を変えてもシステムアカウントなら受け付ける", async () => {
    const { store, env } = await createSeededStore();
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const seed = JSON.parse(await readFile("seeds/core.json", "utf8")) as {
      readonly parts: ReadonlyArray<{
        readonly name: string;
        readonly part_type?: unknown;
        readonly expression?: unknown;
      }>;
    };
    const parts = await Promise.all(
      seed.parts.map(async (seedPart) =>
        part(
          // 組み込みかどうかは式 ({"#builtin": "bit_and"}) で決まり, 名前によらない.
          // 他のパーツが呼んでいる組み込みの名前を変えると, 呼んでいるパーツがパーツを見つけられなくなる
          seedPart.name === "bit-and" ? "bitwise-and" : seedPart.name,
          await resolvePartPlaceholders(seedPart.part_type ?? null),
          await resolvePartPlaceholders(seedPart.expression ?? null),
        ),
      ),
    );
    expect(parts.find((p) => p.name === "bitwise-and")?.expression).toEqual({
      "#builtin": "bit_and",
    });
    expect(await submitCommit(store, env, system, "core", parts)).toEqual({
      status: 200,
      message: "",
    });

    // 一般のアカウントのコンパイラ組み込みは, 名前によらず検査できないので拒否する
    const user = await generateAccountCredentials("user");
    const result = await submitCommit(store, env, user, "app", [
      part("string-concat", null, { "#builtin": "string_concat" }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'string-concat': not supported");
  }, 60_000);
});

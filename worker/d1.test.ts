import { expect, it } from "vitest";
import { seedBundleFingerprint } from "../src/seed_fingerprint.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { bytesToBase64 } from "./store.ts";
import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
  Env,
  SeedBundle,
} from "./types.ts";
import {
  casItem,
  createSqliteD1Database,
  newSignedAccountEvent,
} from "./test_helpers.ts";

it("Cloudflare D1 persistence survives WorkerStore isolate restart", async () => {
  const d1 = createSqliteD1Database();
  const sampleSeed: SeedBundle = {
    events: [
      {
        eventHash: "seed_ev_1",
        signedEventBytes: bytesToBase64(new Uint8Array([1, 2, 3])),
        accountId: "acc_seed",
        eventType: "create_account",
        createdAtRfc3339: "2019-01-31T04:36:01Z",
        timeMs: 1000,
      },
    ],
    contents: [
      {
        contentHash: "seed_content_1",
        contentBytes: bytesToBase64(new Uint8Array([11, 22, 33])),
      },
    ],
  };

  const envWithD1: Env = {
    DB: d1,
    DEFINY_ROOT_DOMAIN: "definy.workers.dev",
    ASSETS: {
      fetch(input: Request | URL | string): Promise<Response> {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.endsWith("/__definy_seed_bundle.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(sampleSeed), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("SPA", { status: 200 }));
      },
    },
  };

  // Isolate 1: deploy-time D1 seed, submit a new event, upload CAS content
  const store1 = new WorkerStore();
  await store1.seedD1(d1, sampleSeed);

  const healthRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/healthz"),
    envWithD1,
    store1,
  );
  const healthJson = await healthRes.json();
  expect(healthJson.storage).toBe("cloudflare-d1");

  const submitRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({
          signedEventBytes: await newSignedAccountEvent(),
        }),
      },
    ),
    envWithD1,
    store1,
  );
  const submitJson = await submitRes.json();
  expect(submitJson.status).toBe("accepted");
  const submittedHash: string = submitJson.eventHash;

  const d1Item = await casItem(new Uint8Array([0x00, 0x61, 0x73, 0x6d]));
  await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/UploadContent",
      {
        method: "POST",
        body: JSON.stringify({ items: [d1Item] }),
      },
    ),
    envWithD1,
    store1,
  );

  // Isolate 2: completely fresh WorkerStore (simulating cold start), WITHOUT ASSETS seed
  const store2 = new WorkerStore({
    expectedSeedFingerprint: await seedBundleFingerprint(sampleSeed),
  });
  const envColdStart: Env = {
    DB: d1,
    DEFINY_ROOT_DOMAIN: "definy.workers.dev",
  };

  // Verify both seeded event and submitted event are persisted in D1
  const eventsRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    envColdStart,
    store2,
  );
  const eventsJson = await eventsRes.json();
  expect(eventsJson.events.length).toBe(2);
  expect(eventsJson.events[0].eventHash).toBe(submittedHash);
  expect(eventsJson.events[1].eventHash).toBe("seed_ev_1");

  // Verify CAS content is persisted in D1
  const contentRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/GetContent",
      {
        method: "POST",
        body: JSON.stringify({ contentHash: d1Item.contentHash }),
      },
    ),
    envColdStart,
    store2,
  );
  const contentJson = await contentRes.json();
  expect(contentJson.item.contentHash).toBe(d1Item.contentHash);
});

it("D1 seeding does not re-run when env.DB is a new wrapper per request or on static assets", async () => {
  const baseD1 = createSqliteD1Database();
  let writeStatementsCount = 0;
  let schemaStatementsCount = 0;
  let seedBundleFetchCount = 0;

  // workerd のようにリクエストごとに異なる D1Database ラッパーオブジェクトを生成するファクトリ
  const createFreshD1Binding = (): D1Database => ({
    prepare(query: string): D1PreparedStatement {
      const normalized = query.trim().toUpperCase();
      if (normalized.startsWith("CREATE ")) {
        schemaStatementsCount++;
      } else if (
        normalized.startsWith("INSERT ") ||
        normalized.startsWith("DELETE ")
      ) {
        writeStatementsCount++;
      }
      return baseD1.prepare(query);
    },
    batch<T = Record<string, unknown>>(
      statements: ReadonlyArray<D1PreparedStatement>,
    ): Promise<ReadonlyArray<D1Result<T>>> {
      return baseD1.batch<T>(statements);
    },
    exec(query: string): Promise<D1ExecResult> {
      return baseD1.exec(query);
    },
  });

  const sampleSeed: SeedBundle = {
    events: [
      {
        eventHash: "seed_ev_once_1",
        signedEventBytes: bytesToBase64(new Uint8Array([1, 2, 3])),
        accountId: "acc_seed_once",
        eventType: "create_account",
        createdAtRfc3339: "2019-01-31T04:36:01Z",
        timeMs: 1000,
      },
    ],
    contents: [
      {
        contentHash: "seed_content_once_1",
        contentBytes: bytesToBase64(new Uint8Array([11, 22, 33])),
      },
    ],
  };

  const makeEnv = (): Env => ({
    DB: createFreshD1Binding(),
    DEFINY_ROOT_DOMAIN: "definy.workers.dev",
    ASSETS: {
      fetch(input: Request | URL | string): Promise<Response> {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.endsWith("/__definy_seed_bundle.json")) {
          seedBundleFetchCount++;
          return Promise.resolve(
            new Response(JSON.stringify(sampleSeed), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("SPA", { status: 200 }));
      },
    },
  });

  const store = new WorkerStore();
  store.loadSeedBundle(sampleSeed);

  // 1. /healthz と静的アセット取得では D1 スキーマ初期化もシード書き込みも一切行われない
  await handleWorkerRequest(
    new Request("https://definy.workers.dev/healthz"),
    makeEnv(),
    store,
  );
  await handleWorkerRequest(
    new Request("https://definy.workers.dev/"),
    makeEnv(),
    store,
  );
  await handleWorkerRequest(
    new Request("https://definy.workers.dev/assets/app.js"),
    makeEnv(),
    store,
  );
  expect(schemaStatementsCount).toBe(0);
  expect(writeStatementsCount).toBe(0);
  expect(seedBundleFetchCount).toBe(0);

  // 2. 初回 API リクエスト（並行 2 リクエスト）で 1 回だけ D1 に同期され、ASSETS フェッチは行われない
  await Promise.all([
    handleWorkerRequest(
      new Request(
        "https://definy.workers.dev/definy.v1.EventService/GetEvents",
        {
          method: "POST",
          body: JSON.stringify({ limit: 10 }),
        },
      ),
      makeEnv(),
      store,
    ),
    handleWorkerRequest(
      new Request(
        "https://definy.workers.dev/definy.v1.EventService/GetEvents",
        {
          method: "POST",
          body: JSON.stringify({ limit: 10 }),
        },
      ),
      makeEnv(),
      store,
    ),
  ]);

  const initialSchemaCount = schemaStatementsCount;
  const initialWriteCount = writeStatementsCount;
  expect(seedBundleFetchCount).toBe(0);
  expect(initialSchemaCount > 0).toBe(true);
  expect(initialWriteCount).toBe(4); // 1 DELETE + 1 event INSERT + 1 cas INSERT + 指紋の INSERT

  // 3. 2 回目以降の API リクエスト（毎回新しい env.DB ラッパーを渡す）では再シードも DDL 実行も一切走らない
  await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    makeEnv(),
    store,
  );
  expect(schemaStatementsCount).toBe(initialSchemaCount);
  expect(writeStatementsCount).toBe(initialWriteCount);
  expect(seedBundleFetchCount).toBe(0);

  // 4. 別 Isolate のコールドスタート時（new WorkerStore()）、D1 バインド時は ASSETS フェッチも DDL 実行も再シードも一切走らない
  // (D1 に記録した seed の指紋が, この isolate のビルド時の指紋と一致する)
  const coldStartStore = new WorkerStore({
    expectedSeedFingerprint: await seedBundleFingerprint(sampleSeed),
  });
  const coldRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    makeEnv(),
    coldStartStore,
  );
  const coldJson = await coldRes.json();
  expect(coldJson.events.length).toBe(1);
  expect(coldJson.events[0].eventHash).toBe("seed_ev_once_1");
  expect(schemaStatementsCount).toBe(initialSchemaCount);
  expect(writeStatementsCount).toBe(initialWriteCount);
  expect(seedBundleFetchCount).toBe(0);
});

it("D1 replaces the old seed when the seed bundle changes, keeping other accounts' events", async () => {
  const d1 = createSqliteD1Database();
  const seedEvent = (eventHash: string, timeMs: number) => ({
    eventHash,
    signedEventBytes: bytesToBase64(new Uint8Array([1, 2, 3])),
    accountId: "acc_system",
    eventType: "module_commit",
    createdAtRfc3339: new Date(timeMs).toISOString(),
    timeMs,
  });
  const oldSeed: SeedBundle = {
    events: [seedEvent("old_seed_core", 1000)],
    contents: [
      {
        contentHash: "stage1",
        contentBytes: bytesToBase64(new Uint8Array([1])),
      },
    ],
  };
  const newSeed: SeedBundle = {
    events: [seedEvent("new_seed_core", 1000)],
    contents: [
      {
        contentHash: "stage1",
        contentBytes: bytesToBase64(new Uint8Array([2])),
      },
    ],
  };

  // 古い seed の D1 に, システムアカウントの編集と他のアカウントのイベントを足す
  await new WorkerStore().seedD1(d1, oldSeed);
  const insertEvent = (eventHash: string, accountId: string) =>
    d1
      .prepare(
        `INSERT INTO events (event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms)
           VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        eventHash,
        "AQID",
        accountId,
        "module_commit",
        "2026-10-21T00:00:00Z",
        2000,
      );
  await d1.batch([
    insertEvent("system_edit_on_old_seed", "acc_system"),
    insertEvent("other_account_edit", "acc_other"),
  ]);

  // 新しい seed でビルドした isolate が起動すると, 古い seed とその上のシステムアカウントの編集は消え,
  // 新しい seed が入る. 他のアカウントのイベントは残る
  const env: Env = {
    DB: d1,
    DEFINY_ROOT_DOMAIN: "definy.workers.dev",
    ASSETS: {
      fetch(): Promise<Response> {
        return Promise.resolve(
          new Response(JSON.stringify(newSeed), { status: 200 }),
        );
      },
    },
  };
  const store = new WorkerStore({
    expectedSeedFingerprint: await seedBundleFingerprint(newSeed),
  });
  const eventsRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    env,
    store,
  );
  const eventsJson = (await eventsRes.json()) as {
    readonly events: ReadonlyArray<{ readonly eventHash: string }>;
  };
  expect(JSON.stringify(eventsJson.events.map((e) => e.eventHash).sort())).toBe(
    JSON.stringify(["new_seed_core", "other_account_edit"]),
  );

  // ハッシュでないキー (stage1) の内容も新しい seed のものになる
  const contentRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/GetContent",
      {
        method: "POST",
        body: JSON.stringify({ contentHash: "stage1" }),
      },
    ),
    env,
    store,
  );
  const contentJson = (await contentRes.json()) as {
    readonly item: { readonly contentBytes: string };
  };
  expect(contentJson.item.contentBytes).toBe(
    bytesToBase64(new Uint8Array([2])),
  );
});

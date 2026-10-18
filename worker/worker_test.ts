import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  handleWorkerRequest,
  isAdminAccount,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";
import { bytesToBase64 } from "./store.ts";
import { loadTestSeedBundle, setupTestRuntime } from "./test_runtime.ts";
import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
  Env,
  SeedBundle,
} from "./types.ts";

// パーツのコンパイル・実行に使う Rust 製ランタイム（ビルド済みのもの）を全テストで設定する
await setupTestRuntime();

function createSqliteD1Database(): D1Database {
  const sqlite = new DatabaseSync(":memory:");

  const createStmt = (
    query: string,
    boundValues: ReadonlyArray<unknown> = [],
  ): D1PreparedStatement => {
    const normalizeParams = (): SQLInputValue[] =>
      boundValues.map((v) => (v === undefined ? null : (v as SQLInputValue)));

    return {
      bind(...values: ReadonlyArray<unknown>): D1PreparedStatement {
        return createStmt(query, values);
      },
      first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query);
        const row = stmt.get(...normalizeParams()) as
          | Record<string, unknown>
          | undefined;
        if (!row) {
          return Promise.resolve(null);
        }
        if (colName) {
          return Promise.resolve((row[colName] as T) ?? null);
        }
        return Promise.resolve({ ...row } as unknown as T);
      },
      run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const res = stmt.run(...normalizeParams());
        return Promise.resolve({
          results: [],
          success: true,
          meta: {
            changes: Number(res.changes),
            last_row_id: Number(res.lastInsertRowid),
          },
        });
      },
      all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const isSelect = query.trim().toUpperCase().startsWith("SELECT");
        if (!isSelect) {
          const res = stmt.run(...normalizeParams());
          return Promise.resolve({
            results: [],
            success: true,
            meta: {
              changes: Number(res.changes),
              last_row_id: Number(res.lastInsertRowid),
            },
          });
        }
        const rows = stmt.all(...normalizeParams()) as ReadonlyArray<
          Record<string, unknown>
        >;
        return Promise.resolve({
          results: rows.map((r) => ({ ...r }) as unknown as T),
          success: true,
        });
      },
    };
  };

  return {
    prepare(query: string): D1PreparedStatement {
      return createStmt(query);
    },
    async batch<T = Record<string, unknown>>(
      statements: ReadonlyArray<D1PreparedStatement>,
    ): Promise<ReadonlyArray<D1Result<T>>> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.all<T>());
      }
      return results;
    },
    exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return Promise.resolve({ count: 1, duration: 0 });
    },
  };
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ??
        `Assertion failed: expected ${JSON.stringify(expected)}, got ${
          JSON.stringify(actual)
        }`,
    );
  }
}

Deno.test("isWorkerFirstPath matches Connect-RPC and dynamic endpoints", () => {
  assertEquals(
    isWorkerFirstPath("/definy.v1.EventService/GetEvents"),
    true,
  );
  assertEquals(
    isWorkerFirstPath("/definy.v1.EventService/GetEvent"),
    true,
  );
  assertEquals(
    isWorkerFirstPath("/definy.v1.DeployService/DeployCloudflare"),
    true,
  );
  assertEquals(isWorkerFirstPath("/virtual/wasm/abc123.wasm"), true);
  assertEquals(isWorkerFirstPath("/healthz"), true);

  assertEquals(isWorkerFirstPath("/"), false);
  assertEquals(isWorkerFirstPath("/assets/definy-ui.js"), false);
});

Deno.test("isAdminAccount checks DEFINY_ADMIN_ACCOUNT_ID case-insensitively", () => {
  const env: Env = {
    DEFINY_ADMIN_ACCOUNT_ID: "0123456789abcdef, FEEDBEEFCAFEBABE",
  };
  assertEquals(isAdminAccount("0123456789abcdef", env), true);
  assertEquals(isAdminAccount("feedbeefcafebabe", env), true);
  assertEquals(isAdminAccount("unknown_user", env), false);
  assertEquals(isAdminAccount("", env), false);
  assertEquals(isAdminAccount(undefined, {}), false);
});

Deno.test("handleWorkerRequest loads seed bundle and serves EventService RPCs", async () => {
  const store = new WorkerStore();
  const sampleSeed: SeedBundle = {
    events: [
      {
        eventHash: "ev_hash_1",
        signedEventBytes: bytesToBase64(new Uint8Array([1, 2, 3])),
        accountId: "acc_1",
        eventType: "create_account",
        createdAtRfc3339: "2019-01-31T04:36:01Z",
        timeMs: 1000,
      },
      {
        eventHash: "ev_hash_2",
        signedEventBytes: bytesToBase64(new Uint8Array([4, 5, 6])),
        accountId: "acc_1",
        eventType: "module_commit",
        createdAtRfc3339: "2019-01-31T04:36:02Z",
        timeMs: 2000,
      },
    ],
    contents: [
      {
        contentHash: "hash_builtin_1",
        contentBytes: bytesToBase64(new Uint8Array([10, 20, 30])),
      },
    ],
  };

  const env: Env = {
    ASSETS: {
      fetch(input: Request | URL | string): Promise<Response> {
        const url = typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
        if (url.endsWith("/__definy_seed_bundle.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(sampleSeed), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("SPA index.html", { status: 200 }));
      },
    },
  };

  // 1. GetEvents returns seeded EventItems sorted by timeMs DESC
  const getEventsRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    env,
    store,
  );
  assertEquals(getEventsRes.status, 200);
  const getEventsJson = await getEventsRes.json();
  assertEquals(getEventsJson.events.length, 2);
  assertEquals(getEventsJson.events[0].eventHash, "ev_hash_2");

  // 1b. GetEvent returns single event by eventHash
  const getEventRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvent", {
      method: "POST",
      body: JSON.stringify({ eventHash: "ev_hash_1" }),
    }),
    env,
    store,
  );
  assertEquals(getEventRes.status, 200);
  const getEventJson = await getEventRes.json();
  assertEquals(getEventJson.event.eventHash, "ev_hash_1");

  // 2. SubmitEvent adds a new event and returns its URL-safe base64 EventHashId
  const newEventB64 = bytesToBase64(new Uint8Array([7, 8, 9]));
  const submitRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({ signedEventBytes: newEventB64 }),
      },
    ),
    env,
    store,
  );
  assertEquals(submitRes.status, 200);
  const submitJson = await submitRes.json();
  assertEquals(typeof submitJson.eventHash, "string");
  assertEquals(submitJson.status, "accepted");

  // 3. CheckMissingHashes & UploadContent & GetContent
  const checkRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/CheckMissingHashes",
      {
        method: "POST",
        body: JSON.stringify({
          contentHashes: ["hash_builtin_1", "hash_missing_2"],
        }),
      },
    ),
    env,
    store,
  );
  const checkJson = await checkRes.json();
  assertEquals(checkJson.missingContentHashes.length, 1);
  assertEquals(checkJson.missingContentHashes[0], "hash_missing_2");

  const uploadRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/UploadContent",
      {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              contentHash: "hash_missing_2",
              contentBytes: bytesToBase64(
                new Uint8Array([0x00, 0x61, 0x73, 0x6d]),
              ),
            },
          ],
        }),
      },
    ),
    env,
    store,
  );
  const uploadJson = await uploadRes.json();
  assertEquals(uploadJson.storedContentHashes.length, 1);
  assertEquals(uploadJson.storedContentHashes[0], "hash_missing_2");

  const getContentRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/GetContent",
      {
        method: "POST",
        body: JSON.stringify({ contentHash: "hash_missing_2" }),
      },
    ),
    env,
    store,
  );
  const getContentJson = await getContentRes.json();
  assertEquals(getContentJson.item.contentHash, "hash_missing_2");

  // 4. Virtual Wasm endpoint serves uploaded Wasm binary
  const wasmRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/virtual/wasm/hash_missing_2.wasm"),
    env,
    store,
  );
  assertEquals(wasmRes.status, 200);
  assertEquals(wasmRes.headers.get("Content-Type"), "application/wasm");
  const wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
  assertEquals(wasmBytes.length, 4);
  assertEquals(wasmBytes[1], 0x61);
});

Deno.test("handleWorkerRequest handles DeployCloudflare and ListDeployments directly", async () => {
  const store = new WorkerStore();
  const env: Env = {
    CLOUDFLARE_API_TOKEN: "cf-test-token",
    CLOUDFLARE_ACCOUNT_ID: "cf-acc-123",
  };

  const mockFetch: typeof fetch = (input: Request | URL | string) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url.endsWith("/subdomain") && !url.includes("/scripts/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            result: { subdomain: "narumincho" },
          }),
          { status: 200 },
        ),
      );
    }
    if (url.includes("/workers/scripts")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                id: "definy-edge-1",
                created_on: "2026-10-10T00:00:00Z",
                modified_on: "2026-10-10T00:00:00Z",
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
  };

  const deployRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.DeployService/DeployCloudflare",
      {
        method: "POST",
        body: JSON.stringify({ scriptName: "definy-edge-1" }),
      },
    ),
    env,
    store,
    mockFetch,
  );
  assertEquals(deployRes.status, 200);
  const deployJson = await deployRes.json();
  assertEquals(deployJson.scriptName, "definy-edge-1");
  assertEquals(deployJson.status, "succeeded");
  assertEquals(
    deployJson.url,
    "https://definy-edge-1.narumincho.workers.dev",
  );

  // Verify ListDeployments records it
  const listRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.DeployService/ListDeployments",
      {
        method: "POST",
        body: JSON.stringify({ limit: 10 }),
      },
    ),
    env,
    store,
    mockFetch,
  );
  const listJson = await listRes.json();
  assertEquals(listJson.deployments.length, 1);
  assertEquals(listJson.deployments[0].provider, "cloudflare_workers");
});

Deno.test("Cloudflare D1 persistence survives WorkerStore isolate restart", async () => {
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
        const url = typeof input === "string"
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
  assertEquals(healthJson.storage, "cloudflare-d1");

  const submitRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({
          signedEventBytes: bytesToBase64(new Uint8Array([99, 100, 101])),
        }),
      },
    ),
    envWithD1,
    store1,
  );
  const submitJson = await submitRes.json();
  assertEquals(submitJson.status, "accepted");
  const submittedHash: string = submitJson.eventHash;

  await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/UploadContent",
      {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              contentHash: "d1_cas_hash_1",
              contentBytes: bytesToBase64(
                new Uint8Array([0x00, 0x61, 0x73, 0x6d]),
              ),
            },
          ],
        }),
      },
    ),
    envWithD1,
    store1,
  );

  // Isolate 2: completely fresh WorkerStore (simulating cold start), WITHOUT ASSETS seed
  const store2 = new WorkerStore();
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
  assertEquals(eventsJson.events.length, 2);
  assertEquals(eventsJson.events[0].eventHash, submittedHash);
  assertEquals(eventsJson.events[1].eventHash, "seed_ev_1");

  // Verify CAS content is persisted in D1
  const contentRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/GetContent",
      {
        method: "POST",
        body: JSON.stringify({ contentHash: "d1_cas_hash_1" }),
      },
    ),
    envColdStart,
    store2,
  );
  const contentJson = await contentRes.json();
  assertEquals(contentJson.item.contentHash, "d1_cas_hash_1");
});

Deno.test("DeployCloudflare compiles definy:deploy part to Wasm and uploads app.wasm multipart module", async () => {
  const bundle = await loadTestSeedBundle();
  const d1 = createSqliteD1Database();
  const env: Env = {
    DB: d1,
    CLOUDFLARE_API_TOKEN: "cf-test-token",
    CLOUDFLARE_ACCOUNT_ID: "cf-acc-123",
  };
  const store = new WorkerStore();
  await store.seedD1(d1, bundle);

  let uploadedWorkerJs = "";
  let uploadedWasmBytes: Uint8Array | null = null;

  const mockFetch: typeof fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (
      url.includes("/workers/scripts/") &&
      !url.endsWith("/subdomain") &&
      init?.method === "PUT" &&
      init?.body instanceof FormData
    ) {
      const workerFile = init.body.get("worker.js");
      if (workerFile instanceof Blob) {
        uploadedWorkerJs = await workerFile.text();
      }
      const wasmFile = init.body.get("app.wasm");
      if (wasmFile instanceof Blob) {
        uploadedWasmBytes = new Uint8Array(await wasmFile.arrayBuffer());
      }
    }

    if (url.endsWith("/subdomain") && !url.includes("/scripts/")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: { subdomain: "narumincho" },
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const deployRes = await handleWorkerRequest(
    new Request(
      "https://definy.narumincho.com/definy.v1.DeployService/DeployCloudflare",
      {
        method: "POST",
        body: JSON.stringify({
          partId: "sample.self-hosted-definy-server",
        }),
      },
    ),
    env,
    store,
    mockFetch,
  );
  assertEquals(deployRes.status, 200);
  const deployJson = await deployRes.json();
  // sample.self-hosted-definy-server specifies cloudflareWorkerName: "self-definy"
  assertEquals(deployJson.scriptName, "self-definy");
  assertEquals(deployJson.url, "https://self-definy.narumincho.workers.dev");
  assertEquals(
    uploadedWorkerJs.includes('import wasmModule from "./app.wasm";'),
    true,
  );
  assertEquals(uploadedWasmBytes !== null, true);
  if (uploadedWasmBytes) {
    const magic = Array.from((uploadedWasmBytes as Uint8Array).slice(0, 4));
    assertEquals(
      JSON.stringify(magic),
      JSON.stringify([0x00, 0x61, 0x73, 0x6d]),
    );

    // 生成された worker.js と app.wasm を実際に V8 WebAssembly.Module として実行し、
    // ReadableStream による HTTP レスポンスおよびリクエストボディの受け渡しを検証する
    const wasmBytes = uploadedWasmBytes as Uint8Array;
    const wasmCopy = new Uint8Array(wasmBytes.byteLength);
    wasmCopy.set(wasmBytes);
    const compiledModule = await WebAssembly.compile(wasmCopy.buffer);
    const executableJs = uploadedWorkerJs
      .replace('import wasmModule from "./app.wasm";', "")
      .replace("export default {", "return {");
    const createWorkerHandler = new Function("wasmModule", executableJs) as (
      mod: WebAssembly.Module,
    ) => { fetch(req: Request): Promise<Response> };
    const workerHandler = createWorkerHandler(compiledModule);

    const healthRes = await workerHandler.fetch(
      new Request("https://self-definy.narumincho.workers.dev/healthz"),
    );
    assertEquals(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assertEquals(healthJson.status, "ok");
    assertEquals(healthJson.service, "self-hosted-definy-server");

    const postRes = await workerHandler.fetch(
      new Request("https://self-definy.narumincho.workers.dev/api/self-host", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      }),
    );
    assertEquals(postRes.status, 200);
    const postText = await postRes.text();
    assertEquals(postText.includes("self-hosted"), true);
  }
});

Deno.test("D1 seeding does not re-run when env.DB is a new wrapper per request or on static assets", async () => {
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
        normalized.startsWith("INSERT ") || normalized.startsWith("DELETE ")
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
        const url = typeof input === "string"
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
  assertEquals(schemaStatementsCount, 0);
  assertEquals(writeStatementsCount, 0);
  assertEquals(seedBundleFetchCount, 0);

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
  assertEquals(seedBundleFetchCount, 0);
  assertEquals(initialSchemaCount > 0, true);
  assertEquals(initialWriteCount, 3); // 1 DELETE + 1 event INSERT + 1 cas INSERT

  // 3. 2 回目以降の API リクエスト（毎回新しい env.DB ラッパーを渡す）では再シードも DDL 実行も一切走らない
  await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    makeEnv(),
    store,
  );
  assertEquals(schemaStatementsCount, initialSchemaCount);
  assertEquals(writeStatementsCount, initialWriteCount);
  assertEquals(seedBundleFetchCount, 0);

  // 4. 別 Isolate のコールドスタート時（new WorkerStore()）、D1 バインド時は ASSETS フェッチも DDL 実行も再シードも一切走らない
  const coldStartStore = new WorkerStore();
  const coldRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    makeEnv(),
    coldStartStore,
  );
  const coldJson = await coldRes.json();
  assertEquals(coldJson.events.length, 1);
  assertEquals(coldJson.events[0].eventHash, "seed_ev_once_1");
  assertEquals(schemaStatementsCount, initialSchemaCount);
  assertEquals(writeStatementsCount, initialWriteCount);
  assertEquals(seedBundleFetchCount, 0);
});

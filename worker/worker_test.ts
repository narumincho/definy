import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  deriveModuleIdBytes,
  deriveModulePartId,
  encodeCborItem,
} from "./cbor.ts";
import {
  buildPreviewUrl,
  extractSubdomainFromHost,
  handleWorkerRequest,
  isAdminAccount,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";
import { bytesToBase64 } from "./store.ts";
import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
  Env,
  SeedBundle,
} from "./types.ts";

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
  assertEquals(
    isWorkerFirstPath("/definy.v1.PreviewService/RegisterPreviewApp"),
    true,
  );
  assertEquals(isWorkerFirstPath("/preview/my-app"), true);
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

Deno.test("extractSubdomainFromHost and buildPreviewUrl support {sub}-definy.narumincho.com and {sub}.definy.workers.dev", () => {
  assertEquals(
    extractSubdomainFromHost(
      "my-app-definy.narumincho.com",
      "definy.narumincho.com",
    ),
    "my-app",
  );
  assertEquals(
    extractSubdomainFromHost(
      "counter-app-definy.narumincho.com:443",
      "definy.narumincho.com",
    ),
    "counter-app",
  );
  assertEquals(
    extractSubdomainFromHost(
      "definy.narumincho.com",
      "definy.narumincho.com",
    ),
    undefined,
  );
  assertEquals(
    extractSubdomainFromHost(
      "blog.narumincho.com",
      "definy.narumincho.com",
    ),
    undefined,
  );
  assertEquals(
    extractSubdomainFromHost("my-app.definy.workers.dev", "definy.workers.dev"),
    "my-app",
  );
  assertEquals(
    extractSubdomainFromHost(
      "my-app.definy.workers.dev:443",
      "definy.workers.dev",
    ),
    "my-app",
  );
  assertEquals(
    extractSubdomainFromHost("definy.workers.dev", "definy.workers.dev"),
    undefined,
  );

  assertEquals(
    buildPreviewUrl("my-app", "definy.narumincho.com"),
    "https://my-app-definy.narumincho.com",
  );
  assertEquals(
    buildPreviewUrl("my-app", "definy.workers.dev"),
    "https://my-app.definy.workers.dev",
  );
  assertEquals(
    buildPreviewUrl("my-app", "localhost:8000"),
    "http://my-app.localhost:8000",
  );
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

Deno.test("handleWorkerRequest enforces admin check on PreviewService and serves preview apps", async () => {
  const store = new WorkerStore();
  const adminAccount =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const env: Env = {
    DEFINY_ADMIN_ACCOUNT_ID: adminAccount,
    DEFINY_ROOT_DOMAIN: "definy.workers.dev",
  };

  // Unauthorized user -> 403 permission_denied
  const unauthRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.PreviewService/RegisterPreviewApp",
      {
        method: "POST",
        body: JSON.stringify({
          appId: "demo",
          accountId: "non_admin",
        }),
      },
    ),
    env,
    store,
  );
  assertEquals(unauthRes.status, 403);

  // Admin user -> 200 OK
  const regRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.PreviewService/RegisterPreviewApp",
      {
        method: "POST",
        body: JSON.stringify({
          appId: "demo",
          displayName: "Demo App",
          partId: "part-1",
          accountId: adminAccount,
        }),
      },
    ),
    env,
    store,
  );
  assertEquals(regRes.status, 200);
  const regJson = await regRes.json();
  assertEquals(regJson.previewUrl, "https://demo.definy.workers.dev");

  // Access via /preview/demo
  const previewRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/preview/demo"),
    env,
    store,
  );
  assertEquals(previewRes.status, 200);
  assertEquals(previewRes.headers.get("X-Definy-Preview-App"), "demo");
});

Deno.test("Cloudflare D1 persistence survives WorkerStore isolate restart", async () => {
  const d1 = createSqliteD1Database();
  const adminAccount = "admin_account_123";
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
    DEFINY_ADMIN_ACCOUNT_ID: adminAccount,
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

  // Isolate 1: seed, submit a new event, upload CAS content, register preview app
  const store1 = new WorkerStore();

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

  await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.PreviewService/RegisterPreviewApp",
      {
        method: "POST",
        body: JSON.stringify({
          appId: "persisted-app",
          displayName: "Persisted App",
          partId: "part-persisted",
          accountId: adminAccount,
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
    DEFINY_ADMIN_ACCOUNT_ID: adminAccount,
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

  // Verify PreviewApp is persisted in D1
  const listAppsRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.PreviewService/ListPreviewApps",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),
    envColdStart,
    store2,
  );
  const listAppsJson = await listAppsRes.json();
  assertEquals(listAppsJson.apps.length, 1);
  assertEquals(listAppsJson.apps[0].appId, "persisted-app");
});

Deno.test("Subdomain https://{sub}-definy.narumincho.com executes definy part as an HTTP server", async () => {
  const d1 = createSqliteD1Database();
  const adminAccount = "admin_narumincho";
  const env: Env = {
    DB: d1,
    DEFINY_ADMIN_ACCOUNT_ID: adminAccount,
    DEFINY_ROOT_DOMAIN: "definy.narumincho.com",
  };
  const store = new WorkerStore();

  // Construct a CBOR SignedEvent containing a ModuleCommit with a pure functional HTTP server part `http_server`
  // Extracts path from req.url ("https://hello-definy.narumincho.com" = 35 bytes) using StringSlice,
  // and returns a 3-chunk Pull-based ByteStream:
  //   state 0 -> yield({ chunk: StringToBytes("<h1>Hello "), nextState: 1 })
  //   state 1 -> yield({ chunk: StringToBytes(path), nextState: 2 })
  //   state 2 -> yield({ chunk: StringToBytes("</h1>"), nextState: 3 })
  //   state 3 -> done
  const accountBytes = new Uint8Array(32);
  accountBytes[0] = 0x42;
  const moduleName = "web_module";
  const partName = "http_server";
  const moduleIdBytes = await deriveModuleIdBytes(accountBytes, moduleName);
  const derivedPartId = await deriveModulePartId(moduleIdBytes, partName);

  const urlExpr = {
    RecordGet: {
      record: { Variable: 1 },
      key: "url",
    },
  };
  const extractedPathExpr = {
    StringSlice: {
      value: urlExpr,
      start: { Number: 35 },
      end: { StringLength: { value: urlExpr } },
    },
  };

  const serverPartExpression = {
    Function: {
      parameters: [{ name: "req", variable_id: 1 }],
      body: {
        TypeLiteral: {
          items: [
            { name: "status", value: { Number: 200 } },
            {
              name: "headers",
              value: {
                ListLiteral: {
                  items: [
                    {
                      TypeLiteral: {
                        items: [
                          { name: "name", value: { String: "content-type" } },
                          {
                            name: "value",
                            value: { String: "text/html; charset=utf-8" },
                          },
                        ],
                      },
                    },
                    {
                      TypeLiteral: {
                        items: [
                          {
                            name: "name",
                            value: { String: "x-custom-header" },
                          },
                          { name: "value", value: { String: "from-definy" } },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              name: "body",
              value: {
                TypeLiteral: {
                  items: [
                    { name: "initialState", value: { Number: 0 } },
                    {
                      name: "next",
                      value: {
                        Function: {
                          parameters: [{ name: "state", variable_id: 2 }],
                          body: {
                            If: {
                              condition: {
                                Equal: {
                                  left: { Variable: 2 },
                                  right: { Number: 0 },
                                },
                              },
                              then: {
                                Variant: {
                                  tag: "yield",
                                  payload: {
                                    TypeLiteral: {
                                      items: [
                                        {
                                          name: "chunk",
                                          value: {
                                            StringToBytes: {
                                              value: { String: "<h1>Hello " },
                                            },
                                          },
                                        },
                                        {
                                          name: "nextState",
                                          value: { Number: 1 },
                                        },
                                      ],
                                    },
                                  },
                                },
                              },
                              else: {
                                If: {
                                  condition: {
                                    Equal: {
                                      left: { Variable: 2 },
                                      right: { Number: 1 },
                                    },
                                  },
                                  then: {
                                    Variant: {
                                      tag: "yield",
                                      payload: {
                                        TypeLiteral: {
                                          items: [
                                            {
                                              name: "chunk",
                                              value: {
                                                StringToBytes: {
                                                  value: extractedPathExpr,
                                                },
                                              },
                                            },
                                            {
                                              name: "nextState",
                                              value: { Number: 2 },
                                            },
                                          ],
                                        },
                                      },
                                    },
                                  },
                                  else: {
                                    If: {
                                      condition: {
                                        Equal: {
                                          left: { Variable: 2 },
                                          right: { Number: 2 },
                                        },
                                      },
                                      then: {
                                        Variant: {
                                          tag: "yield",
                                          payload: {
                                            TypeLiteral: {
                                              items: [
                                                {
                                                  name: "chunk",
                                                  value: {
                                                    StringToBytes: {
                                                      value: {
                                                        String: "</h1>",
                                                      },
                                                    },
                                                  },
                                                },
                                                {
                                                  name: "nextState",
                                                  value: { Number: 3 },
                                                },
                                              ],
                                            },
                                          },
                                        },
                                      },
                                      else: {
                                        Variant: {
                                          tag: "done",
                                          payload: null,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  };

  const innerEventBytes = encodeCborItem({
    account_id: accountBytes,
    time: { value: 1700000000 },
    content: {
      ModuleCommit: {
        module_name: moduleName,
        parts: [
          {
            name: partName,
            expression: serverPartExpression,
          },
        ],
      },
    },
  });

  const signedEventBytes = encodeCborItem({
    event_binary: innerEventBytes,
    signature: new Uint8Array(64),
  });

  const submitRes = await handleWorkerRequest(
    new Request(
      "https://definy.narumincho.com/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({
          signedEventBytes: bytesToBase64(signedEventBytes),
        }),
      },
    ),
    env,
    store,
  );
  assertEquals(submitRes.status, 200);

  // Register preview app with derivedPartId on definy.narumincho.com
  const regRes = await handleWorkerRequest(
    new Request(
      "https://definy.narumincho.com/definy.v1.PreviewService/RegisterPreviewApp",
      {
        method: "POST",
        body: JSON.stringify({
          appId: "hello",
          displayName: "Hello HTTP Server",
          partId: derivedPartId,
          accountId: adminAccount,
        }),
      },
    ),
    env,
    store,
  );
  assertEquals(regRes.status, 200);
  const regJson = await regRes.json();
  assertEquals(regJson.previewUrl, "https://hello-definy.narumincho.com");

  // Request to https://hello-definy.narumincho.com/world executes the part and streams 3 chunks!
  const subRes = await handleWorkerRequest(
    new Request("https://hello-definy.narumincho.com/world"),
    env,
    store,
  );
  assertEquals(subRes.status, 200);
  assertEquals(subRes.headers.get("X-Definy-Preview-App"), "hello");
  assertEquals(
    subRes.headers.get("Content-Type"),
    "text/html; charset=utf-8",
  );
  assertEquals(subRes.headers.get("x-custom-header"), "from-definy");
  assertEquals(subRes.headers.get("Content-Security-Policy"), null);
  const subBody = await subRes.text();
  assertEquals(subBody, "<h1>Hello /world</h1>");

  // Request via same-origin path fallback (/preview/hello/world) includes CSP sandbox to protect IndexedDB
  // Note: effectiveUrl is "https://definy.narumincho.com/world" (29 bytes before "/world")
  const pathRes = await handleWorkerRequest(
    new Request("https://definy.narumincho.com/preview/hello/world"),
    env,
    store,
  );
  assertEquals(pathRes.status, 200);
  assertEquals(
    pathRes.headers.get("Content-Security-Policy"),
    "sandbox allow-scripts allow-forms",
  );
});

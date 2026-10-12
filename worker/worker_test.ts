import {
  extractSubdomainFromHost,
  handleWorkerRequest,
  isAdminAccount,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";
import { bytesToBase64 } from "./store.ts";
import type { Env, SeedBundle } from "./types.ts";

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

Deno.test("extractSubdomainFromHost extracts preview subdomain from host", () => {
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

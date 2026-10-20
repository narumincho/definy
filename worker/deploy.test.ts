import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";
import {
  adminCredentials,
  assertEquals,
  createSqliteD1Database,
  Deno,
  signedPost,
} from "./test_helpers.ts";

Deno.test(
  "handleWorkerRequest handles DeployCloudflare and ListDeployments directly",
  async () => {
    const store = new WorkerStore();
    const env: Env = {
      CLOUDFLARE_API_TOKEN: "cf-test-token",
      CLOUDFLARE_ACCOUNT_ID: "cf-acc-123",
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };

    const mockFetch: typeof fetch = (input: Request | URL | string) => {
      const url =
        typeof input === "string"
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

    const deployUrl =
      "https://definy.workers.dev/definy.v1.DeployService/DeployCloudflare";

    // サーバーのトークンを使うデプロイは管理者の署名が必要
    const anonymousRes = await handleWorkerRequest(
      new Request(deployUrl, {
        method: "POST",
        body: JSON.stringify({ scriptName: "definy-edge-1" }),
      }),
      env,
      store,
      mockFetch,
    );
    assertEquals(anonymousRes.status, 401);

    const nonAdminRes = await handleWorkerRequest(
      await signedPost(
        deployUrl,
        { scriptName: "definy-edge-1" },
        await generateAccountCredentials("someone"),
      ),
      env,
      store,
      mockFetch,
    );
    assertEquals(nonAdminRes.status, 403);

    // 署名後にボディを書き換えたリクエストは拒否する
    const signed = await signedPost(deployUrl, { scriptName: "definy-edge-1" });
    const replayedRes = await handleWorkerRequest(
      new Request(deployUrl, {
        method: "POST",
        headers: signed.headers,
        body: JSON.stringify({ scriptName: "other-script" }),
      }),
      env,
      store,
      mockFetch,
    );
    assertEquals(replayedRes.status, 401);

    // 自分のトークンを渡すデプロイは認証不要
    const ownTokenRes = await handleWorkerRequest(
      new Request(deployUrl, {
        method: "POST",
        body: JSON.stringify({
          scriptName: "own-script",
          apiToken: "user-token",
          accountId: "user-acc",
        }),
      }),
      env,
      store,
      mockFetch,
    );
    assertEquals(ownTokenRes.status, 200);

    const deployRes = await handleWorkerRequest(
      await signedPost(deployUrl, { scriptName: "definy-edge-1" }),
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
    assertEquals(listJson.deployments.length, 2);
    assertEquals(listJson.deployments[0].provider, "cloudflare_workers");
  },
);

Deno.test(
  "DeployCloudflare compiles definy:deploy part to Wasm and uploads app.wasm multipart module",
  async () => {
    const bundle = await loadTestSeedBundle();
    const d1 = createSqliteD1Database();
    const env: Env = {
      DB: d1,
      CLOUDFLARE_API_TOKEN: "cf-test-token",
      CLOUDFLARE_ACCOUNT_ID: "cf-acc-123",
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const store = new WorkerStore();
    await store.seedD1(d1, bundle);

    let uploadedWorkerJs = "";
    let uploadedWasmBytes: Uint8Array | null = null;

    const mockFetch: typeof fetch = async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string"
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
      await signedPost(
        "https://definy.narumincho.com/definy.v1.DeployService/DeployCloudflare",
        { partId: "sample.self-hosted-definy-server" },
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
        new Request(
          "https://self-definy.narumincho.workers.dev/api/self-host",
          {
            method: "POST",
            body: JSON.stringify({ hello: "world" }),
          },
        ),
      );
      assertEquals(postRes.status, 200);
      const postText = await postRes.text();
      assertEquals(postText.includes("self-hosted"), true);
    }
  },
);

Deno.test(
  "DeployCloudflare sends Cloudflare API requests to CLOUDFLARE_API_BASE_URL when set",
  async () => {
    const store = new WorkerStore();
    const env: Env = {
      CLOUDFLARE_API_BASE_URL: "http://127.0.0.1:8788/client/v4/",
    };
    const requestedUrls: Array<string> = [];
    const mockFetch: typeof fetch = (input: Request | URL | string) => {
      requestedUrls.push(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, result: [{ id: "mock-account" }] }),
          { status: 200 },
        ),
      );
    };
    const res = await handleWorkerRequest(
      new Request(
        "https://definy.narumincho.com/definy.v1.DeployService/DeployCloudflare",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiToken: "test-token", scriptName: "mock" }),
        },
      ),
      env,
      store,
      mockFetch,
    );
    assertEquals(res.status, 200);
    assertEquals(requestedUrls.length > 0, true);
    assertEquals(
      requestedUrls.every((url) =>
        url.startsWith("http://127.0.0.1:8788/client/v4/accounts"),
      ),
      true,
    );
  },
);

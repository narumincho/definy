import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import type { Env, HttpProxyFetchResponse } from "./types.ts";
import {
  adminCredentials,
  createSqliteD1Database,
  signedPost,
} from "./test_helpers.ts";
const proxyUrl = "https://definy.workers.dev/definy.v1.HttpProxyService/Fetch";

const proxyRequest = {
  method: "PUT",
  url: "https://api.cloudflare.com/client/v4/accounts/a/workers/scripts/w",
  headers: [
    { name: "Authorization", value: "Bearer cf-token" },
    { name: "Content-Type", value: "application/octet-stream" },
  ],
  bodyBase64: bytesToBase64(new Uint8Array([0, 97, 115, 109])),
};

describe("HttpProxyService/Fetch", () => {
  it("管理者の署名があればリクエストを仲介し, レスポンスをそのまま返す", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const sent: Array<{
      readonly url: string;
      readonly method: string;
      readonly authorization: string | null;
      readonly body: Uint8Array;
    }> = [];
    const mockFetch = (async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      const request = new Request(input, init);
      sent.push({
        url: request.url,
        method: request.method,
        authorization: request.headers.get("Authorization"),
        body: new Uint8Array(await request.arrayBuffer()),
      });
      return new Response('{"success":true}', {
        status: 201,
        headers: { "x-test": "1" },
      });
    }) as typeof fetch;

    const res = await handleWorkerRequest(
      await signedPost(proxyUrl, proxyRequest, adminCredentials),
      env,
      new WorkerStore(),
      mockFetch,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as HttpProxyFetchResponse;
    expect(json.status).toBe(201);
    expect(json.headers).toContainEqual({ name: "x-test", value: "1" });
    expect(new TextDecoder().decode(base64ToBytes(json.bodyBase64))).toBe(
      '{"success":true}',
    );
    expect(sent.map((request) => request.method)).toEqual(["PUT"]);
    expect(sent[0]?.url).toBe(proxyRequest.url);
    // 送り先の Authorization は仲介するリクエストのもの (definy の署名ではない)
    expect(sent[0]?.authorization).toBe("Bearer cf-token");
    expect(Array.from(sent[0]?.body ?? [])).toEqual([0, 97, 115, 109]);
  });

  it("署名が無ければ 401, 管理者でないアカウントなら 403 で, 仲介しない", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    let fetched = 0;
    const mockFetch = (async () => {
      fetched++;
      return new Response("");
    }) as typeof fetch;

    const anonymous = await handleWorkerRequest(
      new Request(proxyUrl, {
        method: "POST",
        body: JSON.stringify(proxyRequest),
      }),
      env,
      new WorkerStore(),
      mockFetch,
    );
    expect(anonymous.status).toBe(401);

    const other = await handleWorkerRequest(
      await signedPost(
        proxyUrl,
        proxyRequest,
        await generateAccountCredentials("other"),
      ),
      env,
      new WorkerStore(),
      mockFetch,
    );
    expect(other.status).toBe(403);
    expect(fetched).toBe(0);
  });

  it("http / https 以外の URL は送らない", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const res = await handleWorkerRequest(
      await signedPost(proxyUrl, {
        ...proxyRequest,
        url: "file:///etc/passwd",
      }),
      env,
      new WorkerStore(),
      (async () => new Response("")) as typeof fetch,
    );
    expect(res.status).toBe(400);
  });
});

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
import {
  browserWasiIoHandler,
  HTTP_PROXY_PATH,
  parseUrlPrefixes,
} from "../src/wasi_io_browser.ts";

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

  it("ブラウザの fetch が CORS で失敗したら, 仲介が有効ならサーバーの仲介で送り直す", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const upstream = (async () =>
      new Response("relayed", { status: 200 })) as typeof fetch;
    let relayed = 0;
    const browserFetch = (async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      if (input === HTTP_PROXY_PATH) {
        relayed++;
        return handleWorkerRequest(
          new Request(`https://definy.workers.dev${HTTP_PROXY_PATH}`, init),
          env,
          new WorkerStore(),
          upstream,
        );
      }
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const request = {
      method: "GET",
      url: "https://api.cloudflare.com/client/v4/user",
      headers: [],
      body: new Uint8Array(),
    };

    const withRelay = await browserWasiIoHandler(
      { relayOnCorsError: true },
      adminCredentials,
      browserFetch,
    )(request);
    expect("ok" in withRelay && withRelay.ok.status).toBe(200);
    expect(
      "ok" in withRelay && new TextDecoder().decode(withRelay.ok.body),
    ).toBe("relayed");
    expect(relayed).toBe(1);

    const withoutRelay = await browserWasiIoHandler(
      { relayOnCorsError: false },
      adminCredentials,
      browserFetch,
    )(request);
    expect(withoutRelay).toEqual({ error: "Failed to fetch" });
    expect(relayed).toBe(1);
  });

  it("シークレットを送ってよい宛先は 1 行に 1 つ書く", () => {
    expect(
      parseUrlPrefixes(" https://api.cloudflare.com/ \n\nhttps://example.com/"),
    ).toEqual(["https://api.cloudflare.com/", "https://example.com/"]);
  });
});

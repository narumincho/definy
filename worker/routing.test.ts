import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import type { Env } from "./types.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { sha256EventHashId } from "../src/sha256.ts";

const origin = "https://definy.workers.dev";

/** `serveAsset` を呼んだパスを覚えるリクエスト */
async function route(
  path: string,
  init?: RequestInit,
  env: Env = { DB: createSqliteD1Database() },
  store: WorkerStore = new WorkerStore(),
): Promise<{ readonly response: Response; readonly assets: string[] }> {
  const assets: string[] = [];
  const response = await handleWorkerRequest(
    new Request(origin + path, init),
    env,
    store,
    fetch,
    () => {
      assets.push(path);
      return Promise.resolve(new Response("asset"));
    },
  );
  return { response, assets };
}

describe("definy.handle-request のルーティング", () => {
  it("Connect-RPC と動的なエンドポイント以外は静的アセットにする", async () => {
    for (const path of ["/", "/assets/definy-ui.js", "/part/abc"]) {
      expect((await route(path)).assets).toEqual([path]);
    }
    for (const path of [
      "/definy.v1.EventService/GetEvents",
      "/definy.v1.HttpProxyService/Fetch",
      "/virtual/wasm/abc123.wasm",
      "/healthz",
    ]) {
      expect((await route(path, { method: "POST" })).assets).toEqual([]);
    }
  });

  it("静的アセットが無ければ 404", async () => {
    const response = await handleWorkerRequest(
      new Request(origin + "/"),
      {},
      new WorkerStore(),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("OPTIONS は CORS のヘッダーで 204", async () => {
    const { response, assets } = await route("/anything", {
      method: "OPTIONS",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
    expect(assets).toEqual([]);
  });

  it("/healthz は Cloudflare のヘッダーから IPv4 / IPv6 だけを返す", async () => {
    const ipVersion = async (headers: Record<string, string>) =>
      (
        (await (await route("/healthz", { headers })).response.json()) as {
          readonly ipVersion: string;
        }
      ).ipVersion;
    expect(await ipVersion({ "CF-Connecting-IP": "203.0.113.5" })).toBe("ipv4");
    expect(await ipVersion({ "CF-Connecting-IP": "2001:db8::1" })).toBe("ipv6");
    // Pseudo IPv4: CF-Connecting-IP は IPv4 に書き換わり、元の IPv6 が別ヘッダーに入る
    expect(
      await ipVersion({
        "CF-Connecting-IP": "240.0.0.1",
        "Cf-Connecting-IPv6": "2001:db8::1",
      }),
    ).toBe("ipv6");
    expect(await ipVersion({})).toBe("unknown");

    const { response } = await route("/healthz", {
      headers: { "CF-Connecting-IP": "2001:db8::1" },
    });
    expect(await response.json()).toEqual({
      status: "ok",
      runtime: "cloudflare-workers",
      storage: "cloudflare-d1",
      ipVersion: "ipv6",
    });
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("無い RPC は unimplemented, JSON でない本文は invalid_argument", async () => {
    const unknown = (await route("/definy.v1.EventService/Unknown")).response;
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({
      code: "unimplemented",
      message: "Endpoint /definy.v1.EventService/Unknown is not implemented",
    });
    const notJson = (
      await route("/definy.v1.EventService/GetEvent", {
        method: "POST",
        body: "not json",
      })
    ).response;
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({
      code: "invalid_argument",
      message: "request body must be JSON",
    });
    const notObject = (
      await route("/definy.v1.EventService/GetEvent", {
        method: "POST",
        body: "[]",
      })
    ).response;
    expect(await notObject.json()).toEqual({
      code: "invalid_argument",
      message: "request body must be an object",
    });
  });

  it("/virtual/wasm/ はストアの Wasm を返し, content hash のときだけ永続キャッシュする", async () => {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const hash = await sha256EventHashId(bytes);
    const store = new WorkerStore();
    store.getRawContentBytes = (key: string) =>
      Promise.resolve(key === hash || key === "named" ? bytes : undefined);

    const byHash = (
      await route(`/virtual/wasm/${hash}.wasm`, {}, undefined, store)
    ).response;
    expect(byHash.status).toBe(200);
    expect(byHash.headers.get("Content-Type")).toBe("application/wasm");
    expect(byHash.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await byHash.arrayBuffer())).toEqual(bytes);

    const named = (await route("/virtual/wasm/named", {}, undefined, store))
      .response;
    expect(named.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );

    const missing = (
      await route("/virtual/wasm/missing.wasm", {}, undefined, store)
    ).response;
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("Wasm binary not found in CAS");
  });
});

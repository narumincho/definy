import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import type { Env } from "./types.ts";
import type { LocalIoHost } from "./service_io.ts";
import { adminCredentials, createSqliteD1Database } from "./test_helpers.ts";
import {
  fetchRunOptions,
  parseUrlPrefixes,
  runIoOnServer,
} from "../src/wasi_io_browser.ts";

/** プログラムを動かしたことを覚える手元のサーバーの能力 */
function recordingLocalIo(): {
  readonly localIo: LocalIoHost;
  readonly ran: Array<{
    readonly wasm: ReadonlyArray<number>;
    readonly parts: ReadonlyArray<readonly [string, unknown]>;
  }>;
} {
  const ran: Array<{
    readonly wasm: ReadonlyArray<number>;
    readonly parts: ReadonlyArray<readonly [string, unknown]>;
  }> = [];
  return {
    ran,
    localIo: {
      runWasiIo: (wasm, parts) => {
        ran.push({ wasm: [...wasm], parts: [...parts] });
        return Promise.resolve({ ok: true, message: "done!", steps: ["x"] });
      },
      readSecrets: () => Promise.resolve([]),
      writeSecret: () => Promise.resolve(false),
    },
  };
}

/** ブラウザの fetch (相対 URL) をサーバーの処理につなぐ */
function browserFetchTo(env: Env): typeof fetch {
  const store = new WorkerStore();
  return (async (input: Request | URL | string, init?: RequestInit) =>
    handleWorkerRequest(
      new Request(new URL(String(input), "https://definy.example"), init),
      env,
      store,
      (async () => {
        throw new Error("the server does not send HTTP requests here");
      }) as typeof fetch,
    )) as typeof fetch;
}

const program = {
  wasm: new Uint8Array([0, 97, 115, 109]),
  parts: [{ id: "part-1", expression: { builtin: "core.plus" } }],
};

describe("RunService (docs/run-location.md)", () => {
  it("Node.js のサーバーでは管理者だけがプログラム全体をサーバーで動かせる", async () => {
    const { localIo, ran } = recordingLocalIo();
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
      DEFINY_RUN_EXPRESSIONS: "1",
      LOCAL_IO: localIo,
    };
    const browserFetch = browserFetchTo(env);
    const other = await generateAccountCredentials("other");

    expect(await fetchRunOptions(adminCredentials, browserFetch)).toEqual({
      administrator: true,
      serverRun: true,
    });
    expect(await fetchRunOptions(other, browserFetch)).toEqual({
      administrator: false,
      serverRun: true,
    });
    expect(await fetchRunOptions(null, browserFetch)).toEqual({
      administrator: false,
      serverRun: true,
    });

    expect(
      await runIoOnServer(program, adminCredentials, browserFetch),
    ).toEqual({ ok: true, message: "done!", steps: ["x"] });
    // パーツの式はストアと同じ CBOR で送り, サーバーで JSON AST に戻る
    expect(ran).toEqual([
      {
        wasm: [0, 97, 115, 109],
        parts: [["part-1", { builtin: "core.plus" }]],
      },
    ]);

    const denied = await runIoOnServer(program, other, browserFetch);
    expect(denied.ok).toBe(false);
    expect(denied.message).toContain("403");
    expect(denied.message).toContain(
      "Only the administrators of this server (DEFINY_ADMIN_ACCOUNT_IDS) can run programs on it",
    );
    expect(ran).toHaveLength(1);
  });

  it("Cloudflare Workers の公開サーバー (実行の能力なし) では管理者でもサーバーで動かせない", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const browserFetch = browserFetchTo(env);
    expect(await fetchRunOptions(adminCredentials, browserFetch)).toEqual({
      administrator: true,
      serverRun: false,
    });
    const result = await runIoOnServer(program, adminCredentials, browserFetch);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("400");
    expect(result.message).toContain("This server cannot run programs");
  });

  it("CORS の仲介 (HttpProxyService/Fetch) は無くなった", async () => {
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_ADMIN_ACCOUNT_IDS: adminCredentials.accountId,
    };
    const response = await browserFetchTo(env)(
      "/definy.v1.HttpProxyService/Fetch",
      { method: "POST", body: "{}" },
    );
    expect(response.status).toBe(404);
  });

  it("シークレットを送ってよい宛先は 1 行に 1 つ書く", () => {
    expect(
      parseUrlPrefixes(" https://api.cloudflare.com/ \n\nhttps://example.com/"),
    ).toEqual(["https://api.cloudflare.com/", "https://example.com/"]);
  });
});

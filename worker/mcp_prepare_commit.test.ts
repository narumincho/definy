/**
 * MCP のツール `definy_prepare_commit_parts` のテスト: クライアントが自分の鍵で署名して `SubmitEvent` で出す
 * (HTML の UI のコミット. docs/html-ui.md)
 */
import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import type { Env } from "./types.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import {
  generateAccountCredentials,
  importPrivateKeyFromSecretKey,
} from "../src/auth.ts";
import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import { encodeCborItem } from "../src/cbor.ts";

const origin = "https://definy.workers.dev";

async function localServer() {
  const credentials = await generateAccountCredentials("local");
  const env: Env = {
    DB: createSqliteD1Database(),
    DEFINY_MCP_ACCOUNT_SECRET_KEY: credentials.secretKeyBase64,
    DEFINY_MCP_ACCOUNT_NAME: "local",
    DEFINY_RUN_EXPRESSIONS: "1",
  };
  const store = new WorkerStore();
  const post = async (path: string, body: unknown): Promise<Response> =>
    handleWorkerRequest(
      new Request(origin + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      env,
      store,
      fetch,
      () => Promise.resolve(new Response("asset")),
    );
  const call = async (name: string, args: unknown) => {
    const json = (await (
      await post("/mcp", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      })
    ).json()) as {
      result: { content: ReadonlyArray<{ text: string }>; isError: boolean };
    };
    return {
      text: json.result.content[0]!.text,
      isError: json.result.isError,
    };
  };
  return { credentials, call, post };
}

/** 署名前のイベント (Base64) に credentials の鍵で署名し, SubmitEvent で出す */
async function signAndSubmit(
  post: (path: string, body: unknown) => Promise<Response>,
  credentials: { readonly secretKeyBase64: string },
  eventBinaryBase64: string,
): Promise<Response> {
  const eventBinary = base64ToBytes(eventBinaryBase64);
  const key = await importPrivateKeyFromSecretKey(credentials.secretKeyBase64);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      key,
      eventBinary as unknown as BufferSource,
    ),
  );
  return await post("/definy.v1.EventService/SubmitEvent", {
    signedEventBytes: bytesToBase64(
      encodeCborItem({
        signature,
        event_binary: { __tag: 24, value: eventBinary },
      }),
    ),
  });
}

describe("definy_prepare_commit_parts", () => {
  it("署名前のイベントを返し, 自分の鍵で署名して SubmitEvent すればコミットになる", async () => {
    const { credentials, call, post } = await localServer();
    expect(
      (await call("definy_create_project", { project: "my-project" })).isError,
    ).toBe(false);
    const prepared = await call("definy_prepare_commit_parts", {
      project: "my-project",
      branch: "main",
      account_id: credentials.accountId,
      changes: [{ part: "my-module.answer", type: "Number", expression: "42" }],
    });
    expect(prepared.isError, prepared.text).toBe(false);

    const submitted = await signAndSubmit(post, credentials, prepared.text);
    expect(submitted.status, await submitted.clone().text()).toBe(200);
    expect(
      await call("definy_run_expression", {
        expression: "@my-module.answer",
        project: "my-project",
      }),
    ).toEqual({ text: "42", isError: false });

    // 他のアカウントの鍵では main にコミットできない (作成者でない)
    const other = await generateAccountCredentials("other");
    const preparedOther = await call("definy_prepare_commit_parts", {
      project: "my-project",
      branch: "main",
      account_id: other.accountId,
      changes: [{ part: "my-module.answer", expression: "43" }],
    });
    expect(preparedOther.isError, preparedOther.text).toBe(false);
    const rejected = await signAndSubmit(post, other, preparedOther.text);
    expect(rejected.status).toBe(400);
    expect(await rejected.text()).toContain(
      "only the account that created the branch can commit to it",
    );
  }, 60_000);

  it("account_id が無ければ理由を返す", async () => {
    const { call } = await localServer();
    expect(
      await call("definy_prepare_commit_parts", {
        project: "p",
        branch: "main",
        changes: [{ part: "m.a", expression: "1" }],
      }),
    ).toEqual({
      text: "project, branch and account_id are required",
      isError: true,
    });
  }, 60_000);
});

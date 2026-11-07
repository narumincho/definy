/**
 * MCP のツール `definy_create_project` のテスト (docs/mcp.md)
 */
import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import type { Env } from "./types.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { generateAccountCredentials } from "../src/auth.ts";

const origin = "https://definy.workers.dev";

function request(
  path: string,
  init: RequestInit,
  env: Env,
  store: WorkerStore,
): Promise<Response> {
  return handleWorkerRequest(
    new Request(origin + path, init),
    env,
    store,
    fetch,
    () => Promise.resolve(new Response("asset")),
  );
}

type ToolCallResult = {
  readonly result: {
    readonly content: ReadonlyArray<{ readonly text: string }>;
    readonly isError: boolean;
  };
};

async function localServer() {
  const credentials = await generateAccountCredentials("local");
  const env: Env = {
    DB: createSqliteD1Database(),
    DEFINY_MCP_ACCOUNT_SECRET_KEY: credentials.secretKeyBase64,
    DEFINY_MCP_ACCOUNT_NAME: "local",
    DEFINY_RUN_EXPRESSIONS: "1",
  };
  const store = new WorkerStore();
  const call = async (name: string, args: unknown) => {
    const json = (await (
      await request(
        "/mcp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        },
        env,
        store,
      )
    ).json()) as ToolCallResult;
    return {
      text: json.result.content[0]!.text,
      isError: json.result.isError,
    };
  };
  return { credentials, call };
}

describe("definy_create_project", () => {
  it("main が空の新しいプロジェクトを作り, 同じ名前はもう作れない", async () => {
    const { credentials, call } = await localServer();
    const created = await call("definy_create_project", {
      project: "my-project",
      description: "My project",
    });
    expect(created.isError, created.text).toBe(false);
    expect(created.text).toContain(
      `Created project my-project with an empty main branch (owned by account ${credentials.accountId})`,
    );
    expect(
      await call("definy_create_project", { project: "my-project" }),
    ).toEqual({ text: "Project my-project already exists", isError: true });
    expect(await call("definy_create_project", {})).toEqual({
      text: "project is required",
      isError: true,
    });

    const committed = await call("definy_commit_parts", {
      project: "my-project",
      branch: "main",
      changes: [{ part: "my-module.answer", type: "Number", expression: "42" }],
    });
    expect(committed.isError, committed.text).toBe(false);
    expect(
      await call("definy_run_expression", {
        expression: "@my-module.answer",
        project: "my-project",
      }),
    ).toEqual({ text: "42", isError: false });
  }, 60_000);
});

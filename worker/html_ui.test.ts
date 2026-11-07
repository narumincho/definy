/**
 * HTML だけの UI (`/html/`, `definy.handle-html-ui`. docs/html-ui.md) と
 * MCP のツール `definy_create_project` のテスト
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
  const get = (path: string) => request(path, {}, env, store);
  return { credentials, call, get };
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
  });
});

describe("definy.handle-html-ui", () => {
  it("公開サーバー (式を実行しない) では 404", async () => {
    const response = await request(
      "/html/",
      {},
      { DB: createSqliteD1Database() },
      new WorkerStore(),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toContain(
      "The HTML UI runs only on the local definy server",
    );
  });

  it("html-ui プロジェクトが無ければ 404", async () => {
    const { get } = await localServer();
    const response = await get("/html/");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain(
      "The html-ui project was not found",
    );
  });

  it("html-ui.handle-request を評価し, RPC と MCP のツールを呼んで HTML を返す", async () => {
    const { call, get } = await localServer();
    expect(
      (await call("definy_create_project", { project: "html-ui" })).isError,
    ).toBe(false);
    const committed = await call("definy_commit_parts", {
      project: "html-ui",
      branch: "main",
      changes: [
        {
          part: "html-ui.handle-request",
          type: "Fn(path: String) -> @definy.html-ui-step",
          expression: `fn(path$0) =>
  #rpc<@definy.html-ui-step>({
    method: "EventService/GetProjectBranches",
    request: "{}",
    then: fn(response$1) =>
      #rpc<@definy.html-ui-step>({
        method: "definy_get_part",
        request: "{\\"project\\":\\"sample\\",\\"part\\":\\"sample.greet\\"}",
        then: fn(response$2) =>
          #respond<@definy.html-ui-step>({
            status: 200,
            content_type: "text/html; charset=utf-8",
            body: @std.string-join(
              items: [
                $0,
                " ",
                match @core.list-get(list: @definy.json-get-array(value: $1.json, key: "branches"), index: 0) {
                  #some(branch$3) =>
                    match @definy.json-get-string(value: $3, key: "projectName") {
                      #some(name$4) =>
                        $4,
                      #none(_) =>
                        "?"
                    },
                  #none(_) =>
                    "none"
                },
                " ",
                $2.text
              ],
              separator: ""
            )
          })
      })
  })`,
        },
      ],
    });
    expect(committed.isError, committed.text).toBe(false);

    const response = await get("/html/p/x");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    const html = await response.text();
    expect(html).toMatch(
      /^\/html\/p\/x [a-z_-]+ sample\.greet \(project sample/,
    );
    expect(html).toContain(
      `@core.string-concat(left: "Hello, ", right: "definy!")`,
    );
  });
});

/**
 * definy で書いた MCP のエンドポイント (`/mcp`, `definy.handle-mcp`. docs/mcp.md) のテスト
 */
import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import type { Env } from "./types.ts";
import { createSqliteD1Database } from "./test_helpers.ts";

const origin = "https://definy.workers.dev";

function mcp(
  body: unknown,
  init: RequestInit = {},
  env: Env = { DB: createSqliteD1Database() },
  store: WorkerStore = new WorkerStore(),
): Promise<Response> {
  return handleWorkerRequest(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
      ...init,
    }),
    env,
    store,
    fetch,
    () => Promise.resolve(new Response("asset")),
  );
}

type ToolCallResult = {
  readonly result: {
    readonly content: ReadonlyArray<{
      readonly type: string;
      readonly text: string;
    }>;
    readonly isError: boolean;
  };
};

describe("definy.handle-mcp", () => {
  it("initialize は求められたバージョンと tools の能力を返す", async () => {
    const response = await mcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    const json = (await response.json()) as {
      readonly jsonrpc: string;
      readonly id: number;
      readonly result: {
        readonly protocolVersion: string;
        readonly capabilities: unknown;
        readonly serverInfo: { readonly name: string };
      };
    };
    expect(json.jsonrpc).toBe("2.0");
    expect(json.id).toBe(1);
    expect(json.result.protocolVersion).toBe("2025-06-18");
    expect(json.result.capabilities).toEqual({ tools: {} });
    expect(json.result.serverInfo.name).toBe("definy");
  });

  it("通知は本文なしの 202, ping は空の結果", async () => {
    const notification = await mcp({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(notification.status).toBe(202);
    expect(await notification.text()).toBe("");

    const ping = await mcp({ jsonrpc: "2.0", id: "p", method: "ping" });
    expect(await ping.json()).toEqual({ jsonrpc: "2.0", id: "p", result: {} });
  });

  it("tools/list は RPC を呼ぶツールを返す", async () => {
    const response = await mcp({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const json = (await response.json()) as {
      readonly result: {
        readonly tools: ReadonlyArray<{
          readonly name: string;
          readonly description: string;
          readonly inputSchema: { readonly type: string };
        }>;
      };
    };
    expect(json.result.tools.map((t) => t.name)).toEqual([
      "definy_get_project",
      "definy_get_part",
      "definy_get_project_branches",
      "definy_get_events",
      "definy_get_event",
      "definy_get_content",
      "definy_check_missing_hashes",
    ]);
    for (const tool of json.result.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("tools/call は RPC のレスポンスの JSON をテキストで返す", async () => {
    const env: Env = { DB: createSqliteD1Database() };
    const store = new WorkerStore();
    const response = await mcp(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "definy_get_project_branches", arguments: {} },
      },
      {},
      env,
      store,
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as ToolCallResult;
    expect(json.result.isError).toBe(false);
    expect(json.result.content[0]!.type).toBe("text");
    // テキストは RPC を直接呼んだときの JSON と同じ値
    const rpc = await handleWorkerRequest(
      new Request(origin + "/definy.v1.EventService/GetProjectBranches", {
        method: "POST",
        body: "{}",
      }),
      env,
      store,
    );
    expect(JSON.parse(json.result.content[0]!.text)).toEqual(await rpc.json());
    const branches = JSON.parse(json.result.content[0]!.text) as {
      readonly branches: ReadonlyArray<unknown>;
    };
    expect(branches.branches.length).toBeGreaterThan(0);
  });

  it("RPC のエラーは isError のツールの結果になる", async () => {
    const response = await mcp({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "definy_get_event", arguments: { eventHash: "nothing" } },
    });
    const json = (await response.json()) as ToolCallResult;
    expect(json.result.isError).toBe(true);
    expect(JSON.parse(json.result.content[0]!.text)).toEqual({
      code: "not_found",
      message: "Event 'nothing' not found",
    });
  });

  it("無いツール・無いメソッド・JSON でない本文は JSON-RPC のエラー", async () => {
    expect(
      await (
        await mcp({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: { name: "nothing" },
        })
      ).json(),
    ).toEqual({
      jsonrpc: "2.0",
      id: 5,
      error: { code: -32602, message: "Unknown tool: nothing" },
    });
    expect(
      await (await mcp({ jsonrpc: "2.0", id: 6, method: "nothing" })).json(),
    ).toEqual({
      jsonrpc: "2.0",
      id: 6,
      error: { code: -32601, message: "Method not found: nothing" },
    });
    const parseError = await mcp("not json");
    expect(parseError.status).toBe(400);
    expect(await parseError.json()).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error: request body must be JSON",
      },
    });
  });

  it("POST 以外は 405", async () => {
    const response = await mcp(undefined, { method: "GET", body: null });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});

/** ツールを呼んでテキストの結果を返す */
async function callTool(
  name: string,
  args: unknown,
): Promise<{ readonly text: string; readonly isError: boolean }> {
  const json = (await (
    await mcp({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    })
  ).json()) as ToolCallResult;
  return { text: json.result.content[0]!.text, isError: json.result.isError };
}

describe("パーツの中身を読むツール", () => {
  it("definy_get_part は型と式を definy のテキストで返す", async () => {
    const { text, isError } = await callTool("definy_get_part", {
      part: "std.number-to-string",
    });
    expect(isError).toBe(false);
    expect(text).toContain("std.number-to-string (project definy, branch main");
    expect(text).toContain("type:\nFn(value: Number) -> String\n");
    expect(text).toContain(
      "expression:\nfn(value$0) =>\n  match @core.less-than(left: $0, right: 0) {\n    true =>\n",
    );
    // パーツの参照は名前で書く
    expect(text).toContain(
      "@std.number-to-string(value: @core.minus(left: 0, right: $0))",
    );
  });

  it("型のパーツは Union{...} や Record{...} で書く", async () => {
    const { text } = await callTool("definy_get_part", {
      part: "core.expression",
      project: "definy",
    });
    expect(text).toContain("type:\nType\n");
    expect(text).toContain("  #type_number,\n");
    expect(text).toContain(
      "  #type_list(Record{item_type: @core.expression}),\n",
    );
  });

  it("definy_get_project はパーツと型の一覧を返す", async () => {
    const { text, isError } = await callTool("definy_get_project", {
      project: "sample",
    });
    expect(isError).toBe(false);
    expect(text).toMatch(
      /^project sample, branch main, commit \S+, modules: sample\n/,
    );
    expect(text).toContain("\nsample.prime-numbers: List<Number>  // (en) ");
  });

  it("無いパーツやプロジェクトは isError", async () => {
    expect(await callTool("definy_get_part", { part: "nothing.x" })).toEqual({
      text: "Part nothing.x was not found",
      isError: true,
    });
    expect(await callTool("definy_get_part", { part: "nodot" })).toEqual({
      text: "part must be in the form 'module.name', e.g. 'core.plus'",
      isError: true,
    });
    expect(
      await callTool("definy_get_project", { project: "sample", branch: "x" }),
    ).toEqual({
      text: "Branch x of project sample was not found (definy_get_project_branches lists them)",
      isError: true,
    });
    expect(await callTool("definy_get_project", {})).toEqual({
      text: "project is required",
      isError: true,
    });
  });
});

describe("definy.json-to-string", () => {
  it("エスケープが必要な文字列も JSON.parse で元に戻る", async () => {
    // ツールの結果のテキストは definy.json-to-string で書くので, RPC のエラーメッセージに
    // エスケープの要る文字を入れて往復させる
    const eventHash = 'a"b\\c\nd\te\u0001f あ😀';
    const response = await mcp({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "definy_get_event", arguments: { eventHash } },
    });
    const json = (await response.json()) as ToolCallResult;
    expect(JSON.parse(json.result.content[0]!.text)).toEqual({
      code: "not_found",
      message: `Event '${eventHash}' not found`,
    });
  });
});

describe("definy.service-io-then-respond", () => {
  it("definy.service-io の全てのタグを扱う", async () => {
    const { default: seed } = (await import("../seeds/definy.json", {
      with: { type: "json" },
    })) as {
      readonly default: {
        readonly parts: ReadonlyArray<{
          readonly name: string;
          readonly expression?: unknown;
        }>;
      };
    };
    const expressionOf = (name: string) =>
      seed.parts.find((p) => p.name === name)!.expression as Record<
        string,
        unknown
      >;
    const tags = (
      expressionOf("service-io")["#type_union"] as ReadonlyArray<{
        readonly tag: string;
      }>
    ).map((v) => v.tag);
    const arms = (
      expressionOf("service-io-then-respond")["#function"] as {
        readonly body: {
          readonly "#match": {
            readonly arms: ReadonlyArray<{
              readonly pattern: {
                readonly "#variant": { readonly tag: string };
              };
            }>;
          };
        };
      }
    ).body["#match"].arms.map((a) => a.pattern["#variant"].tag);
    expect(arms).toEqual(tags);
  });
});

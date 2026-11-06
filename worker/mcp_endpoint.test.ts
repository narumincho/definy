/**
 * definy で書いた MCP のエンドポイント (`/mcp`, `definy.handle-mcp`. docs/mcp.md) のテスト
 */
import { describe, expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import type { Env } from "./types.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import { recordPerfRecord } from "./perf_store.ts";

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
      "definy_whoami",
      "definy_create_branch",
      "definy_commit_parts",
      "definy_get_project_branches",
      "definy_get_events",
      "definy_get_event",
      "definy_get_content",
      "definy_check_missing_hashes",
      "definy_perf_recent_submits",
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

describe("書き込みのツール (専用アカウント)", () => {
  it("鍵が無ければ書き込みは無効", async () => {
    expect((await callTool("definy_whoami", {})).text).toContain(
      "Writing is disabled on this server",
    );
    const created = await callTool("definy_create_branch", {
      project: "sample",
      branch: "x",
    });
    expect(created.isError).toBe(true);
    expect(created.text).toContain("Writing is disabled on this server");
  });

  it("definy_create_branch は専用アカウントのブランチを作り, 中身は元のブランチと同じ", async () => {
    const credentials = await generateAccountCredentials("mcp-bot");
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_MCP_ACCOUNT_SECRET_KEY: credentials.secretKeyBase64,
      DEFINY_MCP_ACCOUNT_NAME: "mcp-bot",
    };
    const store = new WorkerStore();
    const call = async (name: string, args: unknown) => {
      const json = (await (
        await mcp(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          },
          {},
          env,
          store,
        )
      ).json()) as ToolCallResult;
      return {
        text: json.result.content[0]!.text,
        isError: json.result.isError,
      };
    };

    expect((await call("definy_whoami", {})).text).toBe(
      `account id: ${credentials.accountId}\naccount name: mcp-bot\ncreated on this server: no (it is created on the first write)`,
    );
    const created = await call("definy_create_branch", {
      project: "sample",
      branch: "mcp-work",
    });
    expect(created.isError, created.text).toBe(false);
    expect(created.text).toContain(
      `Created branch mcp-work of project sample from main (owned by account ${credentials.accountId})`,
    );
    expect((await call("definy_whoami", {})).text).toContain(
      "created on this server: yes",
    );

    // 同じ名前のブランチはもう作れない
    expect(
      await call("definy_create_branch", {
        project: "sample",
        branch: "mcp-work",
      }),
    ).toEqual({
      text: "Branch mcp-work already exists in project sample",
      isError: true,
    });

    // 新しいブランチの作成者は専用アカウントで, 中身は main と同じ
    const branches = JSON.parse(
      (await call("definy_get_project_branches", {})).text,
    ) as {
      readonly branches: ReadonlyArray<{
        readonly projectName: string;
        readonly branch: string;
        readonly creatorAccountId: string;
      }>;
    };
    expect(
      branches.branches.find(
        (b) => b.projectName === "sample" && b.branch === "mcp-work",
      )?.creatorAccountId,
    ).toBe(credentials.accountId);
    const partsOf = (text: string) => text.split("\n").slice(1).join("\n");
    expect(
      partsOf(
        (
          await call("definy_get_project", {
            project: "sample",
            branch: "mcp-work",
          })
        ).text,
      ),
    ).toBe(
      partsOf((await call("definy_get_project", { project: "sample" })).text),
    );
  }, 60_000);

  it("definy_commit_parts はテキストの型と式でパーツを変え, 足し, 消す", async () => {
    const credentials = await generateAccountCredentials("mcp-bot");
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_MCP_ACCOUNT_SECRET_KEY: credentials.secretKeyBase64,
      DEFINY_MCP_ACCOUNT_NAME: "mcp-bot",
    };
    const store = new WorkerStore();
    const call = async (name: string, args: unknown) => {
      const json = (await (
        await mcp(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          },
          {},
          env,
          store,
        )
      ).json()) as ToolCallResult;
      return {
        text: json.result.content[0]!.text,
        isError: json.result.isError,
      };
    };
    const created = await call("definy_create_branch", {
      project: "sample",
      branch: "mcp-work",
    });
    expect(created.isError, created.text).toBe(false);

    const committed = await call("definy_commit_parts", {
      project: "sample",
      branch: "mcp-work",
      message: "Change parts from MCP",
      changes: [
        { part: "sample.prime-numbers", expression: "[2, 3, 5, 7, 11, 13]" },
        {
          part: "sample.add-one",
          type: "Fn(value: Number) -> Number",
          expression: "fn(value$0) => @core.plus(left: $0, right: 1)",
          description: "Add one",
        },
        {
          part: "extra.answer",
          type: "Number",
          expression: "@sample.add-one(value: 41)",
        },
        { part: "sample.greet", delete: true },
      ],
    });
    expect(committed.isError, committed.text).toBe(false);
    expect(committed.text).toContain(
      "Committed 4 part changes to branch mcp-work of project sample",
    );

    const project = (
      await call("definy_get_project", {
        project: "sample",
        branch: "mcp-work",
      })
    ).text;
    expect(project).toContain("modules: sample, extra\n");
    expect(project).toContain(
      "\nsample.add-one: Fn(value: Number) -> Number  // (en) Add one\n",
    );
    expect(project).toContain("\nextra.answer: Number");
    expect(project).not.toContain("sample.greet");
    const prime = await call("definy_get_part", {
      part: "sample.prime-numbers",
      project: "sample",
      branch: "mcp-work",
    });
    expect(prime.text).toContain("expression:\n[2, 3, 5, 7, 11, 13]");
    // 説明と型は今のまま
    expect(prime.text).toContain("type:\nList<Number>\n");
    const answer = await call("definy_get_part", {
      part: "extra.answer",
      project: "sample",
      branch: "mcp-work",
    });
    expect(answer.text).toContain("expression:\n@sample.add-one(value: 41)");

    // 続けてコミットしても (同じ秒でも) 新しいコミットが最新になる
    const again = await call("definy_commit_parts", {
      project: "sample",
      branch: "mcp-work",
      changes: [{ part: "extra.answer", expression: "42" }],
    });
    expect(again.isError, again.text).toBe(false);
    expect(
      (
        await call("definy_get_part", {
          part: "extra.answer",
          project: "sample",
          branch: "mcp-work",
        })
      ).text,
    ).toContain("expression:\n42");

    // 型が合わないコミットはサーバーが受け付けない
    const wrong = await call("definy_commit_parts", {
      project: "sample",
      branch: "mcp-work",
      changes: [{ part: "sample.prime-numbers", expression: '"not a list"' }],
    });
    expect(wrong.isError).toBe(true);
    expect(wrong.text).toContain(
      "part 'sample.prime-numbers': type error: type_mismatch",
    );
    // テキストの誤りはコミットする前に返す
    expect(
      await call("definy_commit_parts", {
        project: "sample",
        branch: "mcp-work",
        changes: [{ part: "sample.prime-numbers", expression: "[1, " }],
      }),
    ).toEqual({
      text: "The expression of sample.prime-numbers: expected an expression at byte 4",
      isError: true,
    });
    // 作成者でないブランチ (main) にはコミットできない
    const main = await call("definy_commit_parts", {
      project: "sample",
      branch: "main",
      changes: [{ part: "sample.prime-numbers", expression: "[2]" }],
    });
    expect(main.isError).toBe(true);
    expect(main.text).toContain(
      "only the account that created the branch can commit to it",
    );
  }, 60_000);
});

describe("definy_perf_recent_submits", () => {
  it("MCP のリクエストの Authorization ヘッダーでパフォーマンス記録を読み, 既定では SubmitEvent に絞る", async () => {
    const db = createSqliteD1Database();
    for (const path of [
      "/definy.v1.EventService/SubmitEvent",
      "/definy.v1.EventService/GetEvents",
    ]) {
      await recordPerfRecord(db, {
        method: "POST",
        path,
        status: 200,
        startedAtMs: 1_700_000_000_000,
        totalWasmMs: 12.5,
        totalHostMs: 3,
        segments: [{ tag: "sql", count: 2, wasmMs: 10, hostMs: 3 }],
      });
    }
    const env: Env = { DB: db, DEFINY_PERF_TOKEN: "perf-secret" };
    const call = async (args: unknown, authorization?: string) => {
      const json = (await (
        await mcp(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "definy_perf_recent_submits", arguments: args },
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...(authorization === undefined
                ? {}
                : { Authorization: authorization }),
            },
          },
          env,
        )
      ).json()) as ToolCallResult;
      return {
        text: json.result.content[0]!.text,
        isError: json.result.isError,
      };
    };
    const paths = (text: string) =>
      (
        JSON.parse(text) as { records: ReadonlyArray<{ path: string }> }
      ).records.map((r) => r.path);

    const submits = await call({}, "Bearer perf-secret");
    expect(submits.isError).toBe(false);
    expect(paths(submits.text)).toEqual([
      "/definy.v1.EventService/SubmitEvent",
    ]);
    const all = await call({ allRequests: true }, "Bearer perf-secret");
    expect(paths(all.text)).toHaveLength(2);
    expect(await call({}, "Bearer nope")).toEqual({
      text: '{"code":"unauthenticated","message":"a valid perf token is required"}',
      isError: true,
    });
    expect((await call({})).isError).toBe(true);
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

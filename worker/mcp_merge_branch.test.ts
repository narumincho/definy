/**
 * MCP のツール `definy_merge_branch` のテスト (docs/branch.md「取り込み」)
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

describe("definy_merge_branch", () => {
  it("パーツごとに 3 方向マージし, 両方が違うように変えたパーツは取り込む側を使う", async () => {
    const { call } = await localServer();
    const ok = async (name: string, args: unknown) => {
      const result = await call(name, args);
      expect(result.isError, result.text).toBe(false);
      return result.text;
    };
    const value = (part: string, branch: string) =>
      ok("definy_run_expression", {
        expression: "@" + part,
        project: "p",
        branch,
      });
    await ok("definy_create_project", { project: "p" });
    await ok("definy_commit_parts", {
      project: "p",
      branch: "main",
      changes: [
        { part: "m.a", type: "Number", expression: "1" },
        { part: "m.b", type: "Number", expression: "2" },
        { part: "m.c", type: "Number", expression: "3" },
        { part: "m.d", type: "Number", expression: "4" },
      ],
    });
    await ok("definy_create_branch", { project: "p", branch: "feature" });
    await ok("definy_commit_parts", {
      project: "p",
      branch: "feature",
      changes: [
        { part: "m.a", expression: "10" },
        { part: "m.c", expression: "30" },
        { part: "m.d", delete: true },
        { part: "n.e", type: "Number", expression: "5" },
      ],
    });
    await ok("definy_commit_parts", {
      project: "p",
      branch: "main",
      changes: [
        { part: "m.b", expression: "20" },
        { part: "m.c", expression: "300" },
      ],
    });

    const merged = await ok("definy_merge_branch", {
      project: "p",
      branch: "feature",
    });
    expect(merged).toContain("Merged feature into main of project p");
    expect(merged).toContain("the merged branch's version is used: m.c");
    expect(await value("m.a", "main")).toBe("10");
    expect(await value("m.b", "main")).toBe("20");
    expect(await value("m.c", "main")).toBe("30");
    expect(await value("n.e", "main")).toBe("5");
    expect(
      (
        await call("definy_run_expression", {
          expression: "@m.d",
          project: "p",
        })
      ).isError,
    ).toBe(true);

    expect(
      await call("definy_merge_branch", { project: "p", branch: "feature" }),
    ).toEqual({
      text: "Nothing to merge: main already contains the latest commit of feature",
      isError: false,
    });

    // 取り込んだ後にもう一度変えたものだけが次の取り込みで入る (基準は前の取り込み)
    await ok("definy_commit_parts", {
      project: "p",
      branch: "feature",
      changes: [{ part: "m.a", expression: "100" }],
    });
    await ok("definy_commit_parts", {
      project: "p",
      branch: "main",
      changes: [{ part: "m.b", expression: "200" }],
    });
    const second = await ok("definy_merge_branch", {
      project: "p",
      branch: "feature",
    });
    expect(second).not.toContain("version is used");
    expect(await value("m.a", "main")).toBe("100");
    expect(await value("m.b", "main")).toBe("200");
    expect(await value("m.c", "main")).toBe("30");
  }, 120_000);

  it("ブランチが無ければ誤り", async () => {
    const { call } = await localServer();
    await call("definy_create_project", { project: "p" });
    expect(
      await call("definy_merge_branch", { project: "p", branch: "nothing" }),
    ).toEqual({
      text: "Branch nothing of project p was not found",
      isError: true,
    });
    expect(await call("definy_merge_branch", { project: "p" })).toEqual({
      text: "project and branch are required",
      isError: true,
    });
  }, 60_000);
});

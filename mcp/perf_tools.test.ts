/**
 * `definy_perf_recent_submits` (docs/performance-observability.md) のテスト:
 * トークンを付けてエンドポイントを引き、既定では SubmitEvent に絞る。
 * トークンが無ければツールがエラー結果を返す
 */
import { describe, expect, it } from "vitest";
import { DefinyClient, type PerfRecord } from "./definy_client.ts";
import { createTools } from "./tools.ts";

const sampleRecord: PerfRecord = {
  id: 7,
  startedAtMs: 1_700_000_000_000,
  method: "POST",
  path: "/definy.v1.EventService/SubmitEvent",
  status: 200,
  totalWasmMs: 123.5,
  totalHostMs: 12.25,
  segments: [
    { tag: "entry", count: 1, wasmMs: 100, hostMs: 0 },
    { tag: "sql", count: 4, wasmMs: 20, hostMs: 11 },
  ],
};

const perfTool = (client: DefinyClient) =>
  createTools(client).find((t) => t.name === "definy_perf_recent_submits")!;

describe("definy_perf_recent_submits", () => {
  it("トークンを付けて引き、既定では SubmitEvent に絞る", async () => {
    const seen: Array<{ url: string; authorization: string | null }> = [];
    const fetchFn = (async (input: unknown, init?: RequestInit) => {
      seen.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("Authorization"),
      });
      return new Response(JSON.stringify({ records: [sampleRecord] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const client = new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn,
      perfToken: "secret-token",
    });
    const tool = perfTool(client);

    const result = await tool.handler({});
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]?.text ?? "null")).toEqual([
      sampleRecord,
    ]);
    expect(seen[0]?.url).toContain("/__definy/perf/recent-submits");
    expect(seen[0]?.url).toContain("pathContains=SubmitEvent");
    expect(seen[0]?.authorization).toBe("Bearer secret-token");

    const all = await tool.handler({ allRequests: true, limit: 5 });
    expect(all.isError).toBeUndefined();
    expect(seen[1]?.url).not.toContain("pathContains");
    expect(seen[1]?.url).toContain("limit=5");
  });

  it("トークンが無ければエラー結果を返す", async () => {
    const client = new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn: (async () => new Response("{}")) as unknown as typeof fetch,
    });
    const result = await perfTool(client).handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("DEFINY_PERF_TOKEN");
  });

  it("サーバーに拒否されたらエラー結果を返す", async () => {
    const client = new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn: (async () =>
        new Response("unauthenticated", {
          status: 401,
        })) as unknown as typeof fetch,
      perfToken: "wrong",
    });
    const result = await perfTool(client).handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("401");
  });
});

/**
 * パフォーマンス確認の仕組み (docs/performance-observability.md) の統合テスト:
 * 実際の提出 (SubmitEvent) を in-process のサーバーに流すと、ホストが
 * service-io セグメント別の記録を D1 に残し、MCP クライアントの読み取り経路
 * (トークン付きエンドポイント) からその内訳が返ることを確認する
 */
import { describe, expect, it } from "vitest";
import { generateAccountCredentials } from "../src/auth.ts";
import { WorkerStore, handleWorkerRequest } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { readRecentPerfRecords, type PerfRecord } from "./perf_store.ts";
import { DefinyClient } from "../mcp/definy_client.ts";
import { createTools } from "../mcp/tools.ts";
import type { Env } from "./types.ts";

const PERF_TOKEN = "perf-test-token";

describe("パフォーマンス記録の統合", () => {
  it(
    "提出が記録され、MCP の読み取り経路からセグメント内訳が返る",
    { timeout: 60_000 },
    async () => {
      const store = new WorkerStore();
      const db = createSqliteD1Database();
      await store.seedD1(db, await loadTestSeedBundle());
      const env: Env = { DB: db, DEFINY_PERF_TOKEN: PERF_TOKEN };
      const fetchFn = (async (input: string, init?: RequestInit) => {
        const path = String(input).replace(/^https:\/\/example\.test/, "");
        return handleWorkerRequest(
          new Request(`https://definy.local${path}`, init),
          env,
          store,
        );
      }) as typeof fetch;
      const client = new DefinyClient({
        baseUrl: "https://example.test",
        fetchFn,
        perfToken: PERF_TOKEN,
      });

      // 実際に提出を流す (アカウント作成と、小さいプロジェクトの作成コミット)
      const credentials = await generateAccountCredentials("perf-tester");
      await client.submitAccountCreation(credentials);
      const commit = await client.submitCommit({
        credentials,
        projectName: "perfproj",
        branch: "main",
        projectDescription: [],
        message: "initial commit",
        parentCommitHash: null,
        modules: [
          {
            name: "perfproj",
            description: [],
            parts: [
              {
                name: "answer",
                description: [],
                partType: { "#type_number": null },
                expression: { "#number": 42 },
              },
            ],
          },
        ],
      });
      expect(commit.status).toBe("accepted");
      await client.listEvents({ limit: 1 });

      // 記録の書き込みはレスポンスを待たせないので、届くまで少し待つ
      let submit: PerfRecord | undefined;
      for (let i = 0; i < 100 && submit === undefined; i++) {
        const records = await readRecentPerfRecords(db, { limit: 50 });
        submit = records.find(
          (r) =>
            r.path.includes("SubmitEvent") &&
            r.segments.some((s) => s.tag === "read_cached_commits"),
        );
        if (submit === undefined) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      expect(submit).toBeDefined();
      expect(submit?.status).toBe(200);
      expect(submit?.totalWasmMs).toBeGreaterThan(0);
      // コミットの提出では SQL とコミットキャッシュの読み書きが必ず起きる
      const tags = submit?.segments.map((s) => s.tag) ?? [];
      expect(tags).toContain("entry");
      expect(tags).toContain("sql");
      expect(tags).toContain("read_cached_commits");
      expect(tags).toContain("verify_ed25519");
      const sql = submit?.segments.find((s) => s.tag === "sql");
      expect(sql?.count).toBeGreaterThan(0);

      // MCP クライアントの読み取り経路 (トークン付きエンドポイント) からも返る
      const viaEndpoint = await client.listRecentPerfRecords({
        pathContains: "SubmitEvent",
      });
      expect(
        viaEndpoint.some((r) => r.path.includes("SubmitEvent")),
      ).toBeTruthy();

      // MCP ツールとしても返る
      const tool = createTools(client).find(
        (t) => t.name === "definy_perf_recent_submits",
      );
      expect(tool).toBeDefined();
      const result = await tool!.handler({});
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text ?? "null") as Array<{
        path: string;
        segments: Array<{ tag: string }>;
      }>;
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]?.path).toContain("SubmitEvent");
      expect(parsed[0]?.segments.length).toBeGreaterThan(0);

      // トークンが違えば読めない
      const wrongClient = new DefinyClient({
        baseUrl: "https://example.test",
        fetchFn,
        perfToken: "wrong-token",
      });
      await expect(wrongClient.listRecentPerfRecords({})).rejects.toThrow(
        /401/,
      );
    },
  );
});

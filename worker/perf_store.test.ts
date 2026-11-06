/**
 * パフォーマンス記録 (docs/performance-observability.md) のテスト:
 * - 記録を保存して新しい順に読み戻せる
 * - 保持上限 (直近 {@link PERF_RECORD_LIMIT} 件) が効く
 * - 記録の失敗が呼び出し側に伝わらない (受け口は握り潰す)
 * - 読み取りエンドポイントはトークンが無ければ 404、違えば 401、正しければ 200
 */
import { describe, expect, it } from "vitest";
import type { ServiceIoPerfRecord } from "./service_io.ts";
import {
  createPerfSink,
  handlePerfRecentRequest,
  PERF_RECORD_LIMIT,
  readRecentPerfRecords,
  recordPerfRecord,
} from "./perf_store.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import type { D1Database, Env } from "./types.ts";

const record = (index: number): ServiceIoPerfRecord => ({
  method: "POST",
  path: "/definy.v1.EventService/SubmitEvent",
  status: 200,
  startedAtMs: 1_700_000_000_000 + index,
  totalWasmMs: 100.25 + index,
  totalHostMs: 10.5,
  segments: [
    { tag: "entry", count: 1, wasmMs: 50.125, hostMs: 0 },
    { tag: "sql", count: 3, wasmMs: 40, hostMs: 9.5 },
    { tag: "respond", count: 1, wasmMs: 0, hostMs: 0 },
  ],
});

describe("パフォーマンス記録の保存と読み取り", () => {
  it("保存した記録を新しい順に読み戻せる", async () => {
    const db = createSqliteD1Database();
    await recordPerfRecord(db, record(1));
    await recordPerfRecord(db, record(2));
    await recordPerfRecord(db, record(3));
    const records = await readRecentPerfRecords(db, { limit: 20 });
    expect(records.map((r) => r.startedAtMs)).toEqual([
      1_700_000_000_003, 1_700_000_000_002, 1_700_000_000_001,
    ]);
    const [newest] = records;
    expect(newest?.method).toBe("POST");
    expect(newest?.path).toBe("/definy.v1.EventService/SubmitEvent");
    expect(newest?.status).toBe(200);
    expect(newest?.totalWasmMs).toBe(103.25);
    expect(newest?.totalHostMs).toBe(10.5);
    expect(newest?.segments).toEqual([
      { tag: "entry", count: 1, wasmMs: 50.125, hostMs: 0 },
      { tag: "sql", count: 3, wasmMs: 40, hostMs: 9.5 },
      { tag: "respond", count: 1, wasmMs: 0, hostMs: 0 },
    ]);
    expect(newest?.id).toBeGreaterThan(records[1]?.id ?? 0);
  });

  it("パスの部分一致で絞れる", async () => {
    const db = createSqliteD1Database();
    await recordPerfRecord(db, record(1));
    await recordPerfRecord(db, {
      ...record(2),
      path: "/definy.v1.EventService/GetEvents",
    });
    const submits = await readRecentPerfRecords(db, {
      pathContains: "SubmitEvent",
    });
    expect(submits).toHaveLength(1);
    expect(submits[0]?.path).toContain("SubmitEvent");
    const all = await readRecentPerfRecords(db, {});
    expect(all).toHaveLength(2);
  });

  it("保持上限を超えた古い記録は消える", async () => {
    const db = createSqliteD1Database();
    const extra = 5;
    for (let i = 0; i < PERF_RECORD_LIMIT + extra; i++) {
      await recordPerfRecord(db, record(i));
    }
    const records = await readRecentPerfRecords(db, {
      limit: PERF_RECORD_LIMIT,
    });
    expect(records).toHaveLength(PERF_RECORD_LIMIT);
    // 最新が先頭、一番古い保持分が末尾
    expect(records[0]?.startedAtMs).toBe(
      1_700_000_000_000 + PERF_RECORD_LIMIT + extra - 1,
    );
    expect(records[PERF_RECORD_LIMIT - 1]?.startedAtMs).toBe(
      1_700_000_000_000 + extra,
    );
  });
});

describe("記録の失敗の分離", () => {
  const brokenDb = {
    exec: () => Promise.reject(new Error("d1 is broken")),
    prepare: () => {
      throw new Error("d1 is broken");
    },
    batch: () => Promise.reject(new Error("d1 is broken")),
  } as unknown as D1Database;

  it("recordPerfRecord は失敗を例外として伝える", async () => {
    await expect(recordPerfRecord(brokenDb, record(1))).rejects.toThrow(
      "d1 is broken",
    );
  });

  it("受け口 (createPerfSink) は失敗しても例外を投げない", async () => {
    const sink = createPerfSink(brokenDb);
    expect(sink).toBeDefined();
    expect(() => sink?.(record(1))).not.toThrow();
    // 非同期の書き込みが失敗しても、未処理の rejection にならないこと
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("D1 が無ければ受け口自体が無い", () => {
    expect(createPerfSink(undefined)).toBeUndefined();
  });
});

describe("読み取りエンドポイント", () => {
  const url = "https://definy.local/__definy/perf/recent-submits";
  const setup = async (): Promise<{ db: D1Database; env: Env }> => {
    const db = createSqliteD1Database();
    await recordPerfRecord(db, record(1));
    return { db, env: { DB: db, DEFINY_PERF_TOKEN: "perf-secret" } };
  };

  it("トークンが未設定ならエンドポイントは無い (404)", async () => {
    const { db } = await setup();
    const res = await handlePerfRecentRequest(new Request(url), { DB: db });
    expect(res.status).toBe(404);
  });

  it("トークンが無ければ 401、違っても 401", async () => {
    const { env } = await setup();
    const noToken = await handlePerfRecentRequest(new Request(url), env);
    expect(noToken.status).toBe(401);
    const wrong = await handlePerfRecentRequest(
      new Request(url, { headers: { Authorization: "Bearer nope" } }),
      env,
    );
    expect(wrong.status).toBe(401);
  });

  it("正しいトークンで記録が返る", async () => {
    const { env } = await setup();
    const res = await handlePerfRecentRequest(
      new Request(url, {
        headers: { Authorization: "Bearer perf-secret" },
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      records: Array<{ path: string; segments: Array<unknown> }>;
    };
    expect(body.records).toHaveLength(1);
    expect(body.records[0]?.path).toBe("/definy.v1.EventService/SubmitEvent");
    expect(body.records[0]?.segments.length).toBe(3);
  });
});

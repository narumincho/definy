/**
 * パフォーマンス記録 (docs/performance-observability.md) の保存と読み取り。
 *
 * 記録はホストの運用データなので、definy のイベントとは別に D1 の
 * `host_perf_records` テーブルに置く (`host_commit_cache` などと同じ
 * ホスト私用のテーブル。definy からは見えない)。記録は調査のための
 * 付随情報で、記録の失敗で本体のリクエストを失敗させることは決してしない
 */
import type { ServiceIoPerfRecord } from "./service_io.ts";
import type { D1Database, Env } from "./types.ts";

/** 保持する記録の上限。これより古い記録は、新しい記録を書くときに消す */
export const PERF_RECORD_LIMIT = 200;

/**
 * 直近のパフォーマンス記録を返す、ホストの運用エンドポイントのパス。
 * ルーティングは definy が決めるのが原則だが、記録はホスト私用のデータなので
 * 例外的にホストがこのパスだけを先に受ける (`worker/index.ts`)。
 * テスト用のクライアント (`worker/test_definy_client.ts`) もこのパスを使う
 */
export const PERF_RECENT_PATH = "/__definy/perf/recent-submits";

/** 保存されたパフォーマンス記録 (`id` 付き) */
export type PerfRecord = ServiceIoPerfRecord & { readonly id: number };

type PerfRow = {
  readonly id: number;
  readonly recorded_at_ms: number;
  readonly method: string;
  readonly path: string;
  readonly status: number | null;
  readonly total_wasm_ms: number;
  readonly total_host_ms: number;
  readonly segments_json: string;
};

/** テーブルを作った D1 (isolate ごと) */
const tablesReady = new WeakMap<D1Database, Promise<void>>();

function ensurePerfTable(db: D1Database): Promise<void> {
  let ready = tablesReady.get(db);
  if (ready === undefined) {
    ready = (async () => {
      await db.exec(
        "CREATE TABLE IF NOT EXISTS host_perf_records (" +
          "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
          "recorded_at_ms INTEGER NOT NULL, " +
          "method TEXT NOT NULL, " +
          "path TEXT NOT NULL, " +
          "status INTEGER, " +
          "total_wasm_ms REAL NOT NULL, " +
          "total_host_ms REAL NOT NULL, " +
          "segments_json TEXT NOT NULL)",
      );
    })();
    // 作るのに失敗したときは次に書くときにやり直せるようにする
    ready.catch(() => {
      if (tablesReady.get(db) === ready) {
        tablesReady.delete(db);
      }
    });
    tablesReady.set(db, ready);
  }
  return ready;
}

/**
 * 記録を 1 件保存し、保持上限を超えた古い記録を消す。
 * 失敗したら例外を投げる (握り潰すのは呼び出し側の役目)
 */
export async function recordPerfRecord(
  db: D1Database,
  record: ServiceIoPerfRecord,
): Promise<void> {
  await ensurePerfTable(db);
  await db.batch([
    db
      .prepare(
        "INSERT INTO host_perf_records (recorded_at_ms, method, path, status, total_wasm_ms, total_host_ms, segments_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        record.startedAtMs,
        record.method,
        record.path,
        record.status,
        record.totalWasmMs,
        record.totalHostMs,
        JSON.stringify(record.segments),
      ),
    db
      .prepare(
        "DELETE FROM host_perf_records WHERE id NOT IN (SELECT id FROM host_perf_records ORDER BY id DESC LIMIT ?)",
      )
      .bind(PERF_RECORD_LIMIT),
  ]);
}

/**
 * {@link ServiceIoHost.recordPerf} に渡す受け口を作る。`db` が無ければ `undefined`。
 * 書き込みはレスポンスを待たせないが、`waitUntil` があれば書き込みの Promise を
 * 登録し、レスポンスを返した後も完了まで実行されることを保証する (Workers では
 * `waitUntil` に登録されていない非同期処理はレスポンス後に打ち切られ得て、
 * 実際に本番で記録が残らなかった)。`waitUntil` が無い環境 (テストなど) では
 * 投げっぱなしになる。書き込みが失敗してもリクエストには影響しないが、
 * 原因を追えるように握り潰さずログにだけは残す
 */
export function createPerfSink(
  db: D1Database | undefined,
  waitUntil?: ((promise: Promise<unknown>) => void) | undefined,
): ((record: ServiceIoPerfRecord) => void) | undefined {
  if (db === undefined) {
    return undefined;
  }
  return (record) => {
    const written = recordPerfRecord(db, record).catch((error: unknown) => {
      console.error("failed to record a performance record:", error);
    });
    if (waitUntil !== undefined) {
      try {
        waitUntil(written);
      } catch (error) {
        console.error(
          "failed to register a performance record write with waitUntil:",
          error,
        );
      }
    }
  };
}

const roundMs = (ms: number): number => Math.round(ms * 1000) / 1000;

function rowToRecord(row: PerfRow): PerfRecord {
  let segments: ServiceIoPerfRecord["segments"] = [];
  try {
    const parsed: unknown = JSON.parse(row.segments_json);
    if (Array.isArray(parsed)) {
      segments = parsed.map((segment) => {
        const item = segment as {
          tag?: unknown;
          count?: unknown;
          wasmMs?: unknown;
          hostMs?: unknown;
        };
        return {
          tag: String(item.tag ?? ""),
          count: typeof item.count === "number" ? item.count : 0,
          wasmMs: roundMs(typeof item.wasmMs === "number" ? item.wasmMs : 0),
          hostMs: roundMs(typeof item.hostMs === "number" ? item.hostMs : 0),
        };
      });
    }
  } catch {
    // 壊れた行はセグメント無しとして扱う
  }
  return {
    id: row.id,
    startedAtMs: row.recorded_at_ms,
    method: row.method,
    path: row.path,
    status: row.status,
    totalWasmMs: roundMs(row.total_wasm_ms),
    totalHostMs: roundMs(row.total_host_ms),
    segments,
  };
}

/** 直近のパフォーマンス記録 (新しい順)。`pathContains` でパスの部分一致に絞れる */
export async function readRecentPerfRecords(
  db: D1Database,
  options: {
    readonly limit?: number | undefined;
    readonly pathContains?: string | undefined;
  } = {},
): Promise<ReadonlyArray<PerfRecord>> {
  await ensurePerfTable(db);
  const limit = Math.min(
    PERF_RECORD_LIMIT,
    Math.max(1, Math.floor(options.limit ?? 20)),
  );
  const pathContains = options.pathContains;
  const res =
    pathContains === undefined || pathContains === ""
      ? await db
          .prepare(
            "SELECT id, recorded_at_ms, method, path, status, total_wasm_ms, total_host_ms, segments_json FROM host_perf_records ORDER BY id DESC LIMIT ?",
          )
          .bind(limit)
          .all<PerfRow>()
      : await db
          .prepare(
            "SELECT id, recorded_at_ms, method, path, status, total_wasm_ms, total_host_ms, segments_json FROM host_perf_records WHERE path LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT ?",
          )
          .bind(`%${pathContains.replace(/[\\%_]/g, "\\$&")}%`, limit)
          .all<PerfRow>();
  return res.results.map(rowToRecord);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** タイミングの差でトークンを推測されにくい比較 (長さの違いでも最後まで比べる) */
function tokenMatches(provided: string, expected: string): boolean {
  let diff = provided.length ^ expected.length;
  const length = Math.max(provided.length, expected.length);
  for (let i = 0; i < length; i++) {
    diff |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * パフォーマンス記録を読む. 認証は環境変数 `DEFINY_PERF_TOKEN` の Bearer トークン (`authorization` は
 * `Authorization` ヘッダーの値)。未設定ならエンドポイント自体が無いものとして 404 を返す
 * (docs/performance-observability.md)。{@link PERF_RECENT_PATH} と MCP の `definy_perf_recent_submits`
 * (definy の `read_perf_records`) が使う
 */
export async function readPerfRecordsResponse(
  env: Env,
  query: {
    readonly authorization: string;
    readonly limit?: number | undefined;
    readonly pathContains?: string | undefined;
  },
): Promise<{ readonly status: number; readonly body: unknown }> {
  const token = env.DEFINY_PERF_TOKEN;
  if (token === undefined || token === "") {
    return {
      status: 404,
      body: { code: "not_found", message: "the perf endpoint is not enabled" },
    };
  }
  if (!tokenMatches(query.authorization, `Bearer ${token}`)) {
    return {
      status: 401,
      body: {
        code: "unauthenticated",
        message: "a valid perf token is required",
      },
    };
  }
  if (env.DB === undefined) {
    return {
      status: 500,
      body: { code: "internal", message: "the D1 binding DB is required" },
    };
  }
  const limit = query.limit;
  const records = await readRecentPerfRecords(env.DB, {
    limit:
      limit !== undefined && Number.isFinite(limit) && limit > 0
        ? limit
        : undefined,
    pathContains: query.pathContains,
  });
  return { status: 200, body: { records } };
}

/** {@link PERF_RECENT_PATH} へのリクエストを処理する ({@link readPerfRecordsResponse}) */
export async function handlePerfRecentRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const { status, body } = await readPerfRecordsResponse(env, {
    authorization: request.headers.get("Authorization") ?? "",
    limit: Number(url.searchParams.get("limit") ?? ""),
    pathContains: url.searchParams.get("pathContains") ?? undefined,
  });
  return jsonResponse(status, body);
}

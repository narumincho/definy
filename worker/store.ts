import type {
  ContentItem,
  D1Database,
  D1PreparedStatement,
  Env,
  EventItem,
  GetEventsRequest,
  SeedBundle,
  SeedEventEntry,
} from "./types.ts";
import type { SqlRow, SqlStatement } from "./service_io.ts";
import { seedBundleFingerprint } from "../src/seed_fingerprint.ts";
import seedFingerprintFile from "../seeds/seed_bundle_fingerprint.json" with { type: "json" };

/** D1 に入っている seed の指紋を記録する cas_contents のキー */
const SEED_FINGERPRINT_KEY = "seed-bundle-fingerprint";

/** D1 に記録された seed の指紋. 無ければ null */
async function readSeedFingerprint(db: D1Database): Promise<string | null> {
  try {
    return (
      (await db
        .prepare(
          "SELECT content_bytes FROM cas_contents WHERE content_hash = ?",
        )
        .bind(SEED_FINGERPRINT_KEY)
        .first<string>("content_bytes")) ?? null
    );
  } catch {
    return null;
  }
}

const D1_SCHEMA_STATEMENTS: ReadonlyArray<string> = [
  `CREATE TABLE IF NOT EXISTS events (
    event_hash TEXT PRIMARY KEY,
    signed_event_bytes TEXT NOT NULL,
    account_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    created_at_rfc3339 TEXT NOT NULL,
    time_ms INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_time_ms ON events(time_ms DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, time_ms DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_events_account_time ON events(account_id, time_ms DESC)`,
  `CREATE TABLE IF NOT EXISTS cas_contents (
    content_hash TEXT PRIMARY KEY,
    content_bytes TEXT NOT NULL
  )`,
];

const D1_BATCH_CHUNK_SIZE = 50;

import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";

/** CAS へのアップロード内容が不正であることを表すエラー */
export class InvalidContentError extends Error {
  override readonly name = "InvalidContentError";
}

type D1EventRow = {
  readonly event_hash: string;
  readonly signed_event_bytes: string;
  readonly account_id: string;
  readonly event_type: string;
  readonly created_at_rfc3339: string;
  readonly time_ms?: number;
};

type D1ContentRow = {
  readonly content_hash: string;
  readonly content_bytes: string;
};

async function fetchSeedBundle(
  env: Env,
  requestOrigin?: string,
): Promise<SeedBundle | null> {
  // 1. Cloudflare Workers (Static Assets binding)
  if (env.ASSETS) {
    try {
      const origin = requestOrigin || "https://definy.narumincho.workers.dev";
      const assetUrl = new URL("/__definy_seed_bundle.json", origin).toString();
      const res = await env.ASSETS.fetch(new Request(assetUrl));
      if (res.ok) {
        return (await res.json()) as SeedBundle;
      }
    } catch {
      // Fall through
    }
  }

  // 2. Local dev server / Void HTTP fetch
  if (requestOrigin && typeof fetch !== "undefined") {
    try {
      const res = await fetch(
        new URL("/__definy_seed_bundle.json", requestOrigin).toString(),
      );
      if (res.ok) {
        return (await res.json()) as SeedBundle;
      }
    } catch {
      // Fall through
    }
  }

  // 3. Node.js runtime / Vitest fallback
  try {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const path = fileURLToPath(
      new URL("../public/__definy_seed_bundle.json", import.meta.url),
    );
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as SeedBundle;
  } catch {
    // Filesystem not available
  }

  return null;
}

/**
 * Cloudflare Worker 内でイベント・CAS コンテンツを管理するストア。
 * 保存先は常に `env.DB` (Cloudflare D1)。無ければ例外 (2026-11-01 にインメモリストアを無くした。テストは sqlite の D1 を使う)
 */
/** `env.DB` (D1). 無ければ例外 (サーバーは D1 が無いと動かない) */
export function requireDb(env: Env | undefined): D1Database {
  if (env?.DB === undefined) {
    throw new Error("the D1 binding DB is required");
  }
  return env.DB;
}

export class WorkerStore {
  /** D1 の seed がこの指紋なら最新とみなす. 既定はビルド時の seed バンドルの指紋 */
  private readonly expectedSeedFingerprint: string;
  /** 読み込んだ seed バンドルの指紋 (バンドルに無ければ D1 に書くときに計算する) */
  private seedFingerprint: string | undefined;
  private seeded = false;
  private d1SchemaInitialized = false;
  private d1Seeded = false;
  private schemaInitPromise: Promise<void> | null = null;
  private seedPromise: Promise<void> | null = null;
  private seedEvents: ReadonlyArray<SeedEventEntry> = [];
  private seedContents: ReadonlyMap<string, string> = new Map<string, string>();

  constructor(options: { readonly expectedSeedFingerprint?: string } = {}) {
    this.expectedSeedFingerprint =
      options.expectedSeedFingerprint ?? seedFingerprintFile.fingerprint;
  }

  /**
   * D1 テーブルとインデックスを冪等に初期化する。
   * Cloudflare Workers (`workerd`) ではリクエストごとに `env.DB` ラッパーオブジェクトが新規生成されるため、
   * `WeakSet<D1Database>` ではなくインスタンスフラグと in-flight Promise で 1 回のみ初期化する。
   */
  async ensureD1Schema(db: D1Database): Promise<void> {
    if (this.d1SchemaInitialized) {
      return;
    }
    if (!this.schemaInitPromise) {
      this.schemaInitPromise = (async () => {
        try {
          const test = await db.prepare("SELECT 1 FROM events LIMIT 1").first();
          if (test !== undefined) {
            this.d1SchemaInitialized = true;
            return;
          }
        } catch {
          // Table does not exist, run schema statements
        }
        const stmts = D1_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql));
        await db.batch(stmts);
        this.d1SchemaInitialized = true;
      })().finally(() => {
        this.schemaInitPromise = null;
      });
    }
    await this.schemaInitPromise;
  }

  /**
   * デプロイ処理（またはテスト初期化）の一環として D1 スキーマ初期化とシードデータ投入を実行する
   */
  async seedD1(db: D1Database, bundle?: SeedBundle): Promise<void> {
    if (bundle) {
      this.loadSeedBundle(bundle);
    }
    await this.persistSeedToD1(db);
    this.d1Seeded = true;
  }

  /**
   * D1 にシードデータを投入する。D1 スキーマを確実に適用し、未投入時のみシードデータを同期する。
   */
  async ensureSeeded(env: Env, requestOrigin?: string): Promise<void> {
    const db = requireDb(env);
    await this.ensureD1Schema(db);
    if (this.d1Seeded) {
      return;
    }
    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        // D1 の seed が最新なら何もしない (コールドスタートのたびに seed バンドルを取りに行かない)
        if ((await readSeedFingerprint(db)) !== this.expectedSeedFingerprint) {
          if (!this.seeded) {
            const bundle = await fetchSeedBundle(env, requestOrigin);
            if (bundle) {
              this.loadSeedBundle(bundle);
            }
          }
          if (this.seeded) {
            await this.persistSeedToD1(db);
          }
        }
        this.d1Seeded = true;
      })().finally(() => {
        this.seedPromise = null;
      });
    }
    await this.seedPromise;
  }

  private async persistSeedToD1(db: D1Database): Promise<void> {
    await this.ensureD1Schema(db);

    const seedAccounts = new Set<string>();
    for (const ev of this.seedEvents) {
      if (ev.accountId) {
        seedAccounts.add(ev.accountId);
      }
    }

    // D1 側が既に最新シードと一致していれば DELETE / INSERT バッチをスキップする
    const fingerprint =
      this.seedFingerprint ??
      (await seedBundleFingerprint({
        events: this.seedEvents,
        contents: Array.from(
          this.seedContents,
          ([contentHash, contentBytes]) => ({ contentHash, contentBytes }),
        ),
      }));
    if ((await readSeedFingerprint(db)) === fingerprint) {
      return;
    }

    // seed が変わったら, seed のアカウント (システムアカウント) のイベントのうち最新のシードに無いものを
    // すべて削除する. 古いシードの上の編集も消える (古いシードとの互換性は保たない. 残したい編集は
    // npm run export:seeds で seeds/*.json に書き戻しておく)
    const deleteStatements: ReadonlyArray<D1PreparedStatement> =
      seedAccounts.size > 0 && this.seedEvents.length > 0
        ? (() => {
            const hashPlaceholders = this.seedEvents.map(() => "?").join(", ");
            const hashValues = this.seedEvents.map((ev) => ev.eventHash);
            return Array.from(seedAccounts).map((accountId) =>
              db
                .prepare(
                  `DELETE FROM events WHERE account_id = ? AND event_hash NOT IN (${hashPlaceholders})`,
                )
                .bind(accountId, ...hashValues),
            );
          })()
        : [];

    const insertEventStatements: ReadonlyArray<D1PreparedStatement> =
      this.seedEvents.map((ev) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO events (event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            ev.eventHash,
            ev.signedEventBytes,
            ev.accountId,
            ev.eventType,
            ev.createdAtRfc3339,
            ev.timeMs,
          ),
      );

    const insertContentStatements: ReadonlyArray<D1PreparedStatement> =
      Array.from(this.seedContents.entries()).map(
        ([contentHash, contentBytes]) =>
          db
            .prepare(
              `INSERT OR REPLACE INTO cas_contents (content_hash, content_bytes)
             VALUES (?, ?)`,
            )
            .bind(contentHash, contentBytes),
      );

    // 指紋は最後に書く (途中で失敗したら次の起動で同期し直す)
    const statements: ReadonlyArray<D1PreparedStatement> = [
      ...deleteStatements,
      ...insertEventStatements,
      ...insertContentStatements,
      db
        .prepare(
          `INSERT OR REPLACE INTO cas_contents (content_hash, content_bytes)
           VALUES (?, ?)`,
        )
        .bind(SEED_FINGERPRINT_KEY, fingerprint),
    ];

    for (let i = 0; i < statements.length; i += D1_BATCH_CHUNK_SIZE) {
      const chunk = statements.slice(i, i + D1_BATCH_CHUNK_SIZE);
      if (chunk.length > 0) {
        await db.batch(chunk);
      }
    }
  }

  /**
   * D1 に書くシードバンドルを読み込む
   */
  loadSeedBundle(bundle: SeedBundle): void {
    this.seeded = true;
    this.seedFingerprint = bundle.fingerprint;
    const nextSeedHashes = new Set<string>();
    const nextSeedEvents: SeedEventEntry[] = [];
    for (const ev of bundle.events) {
      if (!nextSeedHashes.has(ev.eventHash)) {
        nextSeedHashes.add(ev.eventHash);
        nextSeedEvents.push(ev);
      }
    }
    this.seedEvents = nextSeedEvents;

    const nextSeedContents = new Map<string, string>(this.seedContents);
    for (const item of bundle.contents) {
      nextSeedContents.set(item.contentHash, item.contentBytes);
    }
    this.seedContents = nextSeedContents;
  }

  /**
   * イベント一覧を取得する（`timeMs` 降順）
   */
  async getEvents(
    req: GetEventsRequest,
    env?: Env,
  ): Promise<ReadonlyArray<EventItem>> {
    const requestedType = req.eventType;
    const offset = Math.max(0, req.offset ?? 0);
    const limit = Math.min(500, Math.max(1, req.limit ?? 50));

    const db = requireDb(env);
    await this.ensureD1Schema(db);
    let stmt: D1PreparedStatement;
    if (requestedType) {
      const normalized = requestedType.toLowerCase().replace(/_/g, "");
      stmt = db
        .prepare(
          `SELECT event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms
         FROM events
         WHERE REPLACE(LOWER(event_type), '_', '') = ?
         ORDER BY time_ms DESC
         LIMIT ? OFFSET ?`,
        )
        .bind(normalized, limit, offset);
    } else {
      stmt = db
        .prepare(
          `SELECT event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms
         FROM events
         ORDER BY time_ms DESC
         LIMIT ? OFFSET ?`,
        )
        .bind(limit, offset);
    }
    const res = await stmt.all<D1EventRow>();
    return res.results.map((r) => ({
      eventHash: r.event_hash,
      signedEventBytes: r.signed_event_bytes,
      accountId: r.account_id,
      eventType: r.event_type,
      createdAtRfc3339: r.created_at_rfc3339,
      timeMs:
        r.time_ms ??
        (r.created_at_rfc3339 ? Date.parse(r.created_at_rfc3339) : 0),
    }));
  }

  /**
   * 指定されたハッシュ一覧のうち、CAS に未保存のハッシュ一覧を返す
   */
  async checkMissingHashes(
    hashes: ReadonlyArray<string>,
    env?: Env,
  ): Promise<ReadonlyArray<string>> {
    if (hashes.length === 0) {
      return [];
    }

    const db = requireDb(env);
    const existing = new Set<string>();
    for (let i = 0; i < hashes.length; i += D1_BATCH_CHUNK_SIZE) {
      const chunk = hashes.slice(i, i + D1_BATCH_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(", ");
      const res = await db
        .prepare(
          `SELECT content_hash FROM cas_contents WHERE content_hash IN (${placeholders})`,
        )
        .bind(...chunk)
        .all<{ readonly content_hash: string }>();
      for (const row of res.results) {
        existing.add(row.content_hash);
      }
    }
    return hashes.filter((h) => !existing.has(h));
  }

  /**
   * CAS にコンテンツを保存し、保存したハッシュ一覧を返す。
   * `contentHash` が `contentBytes` の SHA-256 (URL-safe Base64) と一致しない項目が 1 つでもあれば
   * 何も保存せずに `InvalidContentError` を投げる。既存のハッシュは上書きしない。
   */
  async uploadContent(
    items: ReadonlyArray<ContentItem>,
    env?: Env,
  ): Promise<ReadonlyArray<string>> {
    const verified: ReadonlyArray<ContentItem> = await Promise.all(
      items.map(async (item) => {
        const bytes = base64ToBytes(item.contentBytes);
        const actualHash = await sha256EventHashId(bytes);
        if (actualHash !== item.contentHash) {
          throw new InvalidContentError(
            `contentHash '${item.contentHash}' does not match SHA-256 of contentBytes ('${actualHash}')`,
          );
        }
        return {
          contentHash: actualHash,
          contentBytes: bytesToBase64(bytes),
        };
      }),
    );

    const db = requireDb(env);
    if (verified.length > 0) {
      const statements = verified.map((item) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO cas_contents (content_hash, content_bytes)
           VALUES (?, ?)`,
          )
          .bind(item.contentHash, item.contentBytes),
      );
      for (let i = 0; i < statements.length; i += D1_BATCH_CHUNK_SIZE) {
        await db.batch(statements.slice(i, i + D1_BATCH_CHUNK_SIZE));
      }
    }
    return verified.map((item) => item.contentHash);
  }

  /**
   * 指定されたハッシュ一覧に対応する CAS コンテンツを取得する
   */
  async getContentItems(
    hashes: ReadonlyArray<string>,
    env?: Env,
  ): Promise<ReadonlyArray<ContentItem>> {
    if (hashes.length === 0) {
      return [];
    }

    const db = requireDb(env);
    const byHash = new Map<string, string>();
    for (let i = 0; i < hashes.length; i += D1_BATCH_CHUNK_SIZE) {
      const chunk = hashes.slice(i, i + D1_BATCH_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(", ");
      const res = await db
        .prepare(
          `SELECT content_hash, content_bytes FROM cas_contents WHERE content_hash IN (${placeholders})`,
        )
        .bind(...chunk)
        .all<D1ContentRow>();
      for (const row of res.results) {
        byHash.set(row.content_hash, row.content_bytes);
      }
    }
    return hashes.flatMap((h) => {
      const b64 = byHash.get(h);
      return b64 !== undefined ? [{ contentHash: h, contentBytes: b64 }] : [];
    });
  }
}

export const defaultStore = new WorkerStore();

/**
 * definy の `sql` の文を D1 で順に実行し, それぞれの結果の行を返す (docs/database.md).
 * 2 つ以上の文は `batch` で 1 つのトランザクションにする
 */
export async function runD1Statements(
  db: D1Database,
  statements: ReadonlyArray<SqlStatement>,
): Promise<ReadonlyArray<ReadonlyArray<SqlRow>>> {
  const prepared = statements.map((statement) =>
    db.prepare(statement.sql).bind(...statement.params),
  );
  if (prepared.length === 1) {
    return [(await prepared[0]!.all<SqlRow>()).results];
  }
  if (prepared.length === 0) {
    return [];
  }
  return (await db.batch<SqlRow>(prepared)).map((result) => result.results);
}

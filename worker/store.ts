import type {
  ContentItem,
  ContentItemInput,
  D1Database,
  D1PreparedStatement,
  DeploymentHistoryItem,
  Env,
  EventItem,
  GetEventsRequest,
  SeedBundle,
  SeedEventEntry,
  SubmitEventResponse,
} from "./types.ts";

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
  `CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    commit_hash TEXT,
    status TEXT NOT NULL,
    url TEXT NOT NULL,
    app_url TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at_rfc3339 TEXT NOT NULL,
    wasm_hash TEXT,
    provider TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deployments_id ON deployments(id DESC)`,
];

const D1_BATCH_CHUNK_SIZE = 50;

import {
  base64ToBytes,
  bytesToBase64,
  parseSignedEventMetadata,
  sha256EventHashId,
} from "./cbor.ts";

export {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  parseSignedEventMetadata,
  sha256EventHashId,
} from "./cbor.ts";

interface D1EventRow {
  readonly event_hash: string;
  readonly signed_event_bytes: string;
  readonly account_id: string;
  readonly event_type: string;
  readonly created_at_rfc3339: string;
}

interface D1ContentRow {
  readonly content_hash: string;
  readonly content_bytes: string;
}

interface D1DeploymentRow {
  readonly machine_id: string;
  readonly commit_hash: string | null;
  readonly status: string;
  readonly url: string;
  readonly app_url: string;
  readonly region: string;
  readonly created_at_rfc3339: string;
  readonly wasm_hash: string | null;
  readonly provider: string | null;
}

/**
 * Cloudflare Worker 内でイベント・CAS コンテンツ・デプロイ履歴を管理するストア。
 * `env.DB` (Cloudflare D1) がバインドされている場合は D1 (SQLite) に永続化し、
 * 未バインド時はインメモリストアとして動作する。
 */
export class WorkerStore {
  private seeded = false;
  private d1SchemaInitialized = false;
  private d1Seeded = false;
  private schemaInitPromise: Promise<void> | null = null;
  private seedPromise: Promise<void> | null = null;
  private seedEvents: ReadonlyArray<SeedEventEntry> = [];
  private seedContents: ReadonlyMap<string, string> = new Map<string, string>();
  private events: ReadonlyArray<SeedEventEntry> = [];
  private eventHashes: ReadonlySet<string> = new Set<string>();
  private contents: ReadonlyMap<string, string> = new Map<string, string>();
  private deployments: ReadonlyArray<DeploymentHistoryItem> = [];

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
   * Static Assets バインディングから `__definy_seed_bundle.json` をロードし、
   * D1（バインドされている場合）およびインメモリストアに初期データを投入する
   */
  async ensureSeeded(env: Env, requestOrigin?: string): Promise<void> {
    if (this.seeded && (!env.DB || this.d1Seeded)) {
      return;
    }
    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        if (env.DB) {
          await this.ensureD1Schema(env.DB);
        }

        if (!this.seeded && env.ASSETS) {
          const origin = requestOrigin ||
            "https://definy.narumincho.workers.dev";
          const assetUrl = new URL("/__definy_seed_bundle.json", origin)
            .toString();
          try {
            const res = await env.ASSETS.fetch(new Request(assetUrl));
            if (res.ok) {
              const bundle = (await res.json()) as SeedBundle;
              this.loadSeedBundle(bundle);
            }
          } catch {
            // Static Assets 取得失敗時は無視して継続
          }
        }

        if (env.DB && !this.d1Seeded && this.seeded) {
          await this.persistSeedToD1(env.DB);
          this.d1Seeded = true;
        }
      })().finally(() => {
        this.seedPromise = null;
      });
    }
    await this.seedPromise;
  }

  private async isD1AlreadySeeded(
    db: D1Database,
    seedAccounts: ReadonlySet<string>,
  ): Promise<boolean> {
    if (this.seedEvents.length === 0 || this.seedEvents.length > 90) {
      return false;
    }
    const hashPlaceholders = this.seedEvents.map(() => "?").join(", ");
    const hashValues = this.seedEvents.map((ev) => ev.eventHash);

    const existingSeedEvents = await db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM events WHERE event_hash IN (${hashPlaceholders})`,
      )
      .bind(...hashValues)
      .first<number>("cnt");

    if ((existingSeedEvents ?? 0) < hashValues.length) {
      return false;
    }

    if (seedAccounts.size > 0) {
      const accountValues = Array.from(seedAccounts);
      const accountPlaceholders = accountValues.map(() => "?").join(", ");
      const obsoleteEvents = await db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM events WHERE account_id IN (${accountPlaceholders}) AND event_hash NOT IN (${hashPlaceholders})`,
        )
        .bind(...accountValues, ...hashValues)
        .first<number>("cnt");
      if ((obsoleteEvents ?? 0) > 0) {
        return false;
      }
    }

    if (this.seedContents.size > 0) {
      const existingCasCount = await db
        .prepare("SELECT COUNT(*) AS cnt FROM cas_contents")
        .first<number>("cnt");
      if ((existingCasCount ?? 0) < this.seedContents.size) {
        return false;
      }
    }

    return true;
  }

  private async persistSeedToD1(db: D1Database): Promise<void> {
    await this.ensureD1Schema(db);

    const seedAccounts = new Set<string>();
    for (const ev of this.seedEvents) {
      if (ev.accountId) {
        seedAccounts.add(ev.accountId);
      }
    }

    // コールドスタート時に D1 側が既に最新シードと一致していれば DELETE / INSERT バッチをスキップする
    if (await this.isD1AlreadySeeded(db, seedAccounts)) {
      return;
    }

    const statements: D1PreparedStatement[] = [];

    // 組み込みシステムアカウントの古いシードイベント（過去デプロイ分）を D1 から削除し、最新シードに同期する
    if (seedAccounts.size > 0 && this.seedEvents.length > 0) {
      const hashPlaceholders = this.seedEvents.map(() => "?").join(", ");
      const hashValues = this.seedEvents.map((ev) => ev.eventHash);
      for (const accountId of seedAccounts) {
        statements.push(
          db
            .prepare(
              `DELETE FROM events WHERE account_id = ? AND event_hash NOT IN (${hashPlaceholders})`,
            )
            .bind(accountId, ...hashValues),
        );
      }
    }

    for (const ev of this.seedEvents) {
      statements.push(
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
    }

    for (const [contentHash, contentBytes] of this.seedContents.entries()) {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO cas_contents (content_hash, content_bytes)
             VALUES (?, ?)`,
          )
          .bind(contentHash, contentBytes),
      );
    }

    for (let i = 0; i < statements.length; i += D1_BATCH_CHUNK_SIZE) {
      const chunk = statements.slice(i, i + D1_BATCH_CHUNK_SIZE);
      if (chunk.length > 0) {
        await db.batch(chunk);
      }
    }
  }

  /**
   * シードバンドルをインメモリストアに反映する
   */
  loadSeedBundle(bundle: SeedBundle): void {
    this.seeded = true;
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

    const nextHashes = new Set<string>(this.eventHashes);
    const mergedEvents: SeedEventEntry[] = [...this.events];

    for (const ev of bundle.events) {
      if (!nextHashes.has(ev.eventHash)) {
        nextHashes.add(ev.eventHash);
        mergedEvents.push(ev);
      }
    }
    mergedEvents.sort((a, b) => b.timeMs - a.timeMs);
    this.events = mergedEvents;
    this.eventHashes = nextHashes;

    const nextContents = new Map<string, string>(this.contents);
    for (const item of bundle.contents) {
      nextContents.set(item.contentHash, item.contentBytes);
    }
    this.contents = nextContents;
  }

  /**
   * イベント一覧を取得する（`timeMs` 降順）
   */
  async getEvents(
    req: GetEventsRequest,
    env?: Env,
  ): Promise<ReadonlyArray<EventItem>> {
    const requestedType = req.eventType ?? req.event_type;
    const offset = Math.max(0, req.offset ?? 0);
    const limit = Math.min(500, Math.max(1, req.limit ?? 50));

    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      let stmt: D1PreparedStatement;
      if (requestedType) {
        const normalized = requestedType.toLowerCase().replace(/_/g, "");
        stmt = env.DB.prepare(
          `SELECT event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339
           FROM events
           WHERE REPLACE(LOWER(event_type), '_', '') = ?
           ORDER BY time_ms DESC
           LIMIT ? OFFSET ?`,
        ).bind(normalized, limit, offset);
      } else {
        stmt = env.DB.prepare(
          `SELECT event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339
           FROM events
           ORDER BY time_ms DESC
           LIMIT ? OFFSET ?`,
        ).bind(limit, offset);
      }
      const res = await stmt.all<D1EventRow>();
      return res.results.map((r) => ({
        eventHash: r.event_hash,
        signedEventBytes: r.signed_event_bytes,
        accountId: r.account_id,
        eventType: r.event_type,
        createdAtRfc3339: r.created_at_rfc3339,
      }));
    }

    let filtered = this.events;
    if (requestedType) {
      const normalized = requestedType.toLowerCase().replace(/_/g, "");
      filtered = filtered.filter(
        (e) => e.eventType.toLowerCase().replace(/_/g, "") === normalized,
      );
    }
    return filtered.slice(offset, offset + limit).map((e) => ({
      eventHash: e.eventHash,
      signedEventBytes: e.signedEventBytes,
      accountId: e.accountId,
      eventType: e.eventType,
      createdAtRfc3339: e.createdAtRfc3339,
    }));
  }

  /**
   * 単一イベントを `eventHash` で取得する
   */
  async getEvent(
    eventHash: string,
    env?: Env,
  ): Promise<EventItem | undefined> {
    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      const row = await env.DB.prepare(
        `SELECT event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339
         FROM events
         WHERE event_hash = ?`,
      )
        .bind(eventHash)
        .first<D1EventRow>();
      if (!row) {
        return undefined;
      }
      return {
        eventHash: row.event_hash,
        signedEventBytes: row.signed_event_bytes,
        accountId: row.account_id,
        eventType: row.event_type,
        createdAtRfc3339: row.created_at_rfc3339,
      };
    }

    const found = this.events.find((e) => e.eventHash === eventHash);
    if (!found) {
      return undefined;
    }
    return {
      eventHash: found.eventHash,
      signedEventBytes: found.signedEventBytes,
      accountId: found.accountId,
      eventType: found.eventType,
      createdAtRfc3339: found.createdAtRfc3339,
    };
  }

  /**
   * 署名済みイベントバイナリ（Base64）を検証・追加し、`SubmitEventResponse` を返す
   */
  async submitEventWithStatus(
    eventBinaryBase64: string,
    fallbackEventType = "module_commit",
    env?: Env,
  ): Promise<SubmitEventResponse> {
    const bytes = base64ToBytes(eventBinaryBase64);
    const eventHash = await sha256EventHashId(bytes);
    const meta = parseSignedEventMetadata(bytes, fallbackEventType);

    if (meta.referencedContentHashes.length > 0) {
      const missing = await this.checkMissingHashes(
        meta.referencedContentHashes,
        env,
      );
      if (missing.length > 0) {
        return {
          eventHash,
          status: "missing_content",
          missingContentHashes: missing,
        };
      }
    }

    const normalizedB64 = bytesToBase64(bytes);

    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      await env.DB.prepare(
        `INSERT OR IGNORE INTO events (event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          eventHash,
          normalizedB64,
          meta.accountId,
          meta.eventType,
          meta.createdAtRfc3339,
          meta.timeMs,
        )
        .run();
    }

    if (!this.eventHashes.has(eventHash)) {
      const nextHashes = new Set<string>(this.eventHashes);
      nextHashes.add(eventHash);
      const entry: SeedEventEntry = {
        eventHash,
        signedEventBytes: normalizedB64,
        accountId: meta.accountId,
        eventType: meta.eventType,
        createdAtRfc3339: meta.createdAtRfc3339,
        timeMs: meta.timeMs,
      };
      this.events = [entry, ...this.events];
      this.eventHashes = nextHashes;
    }

    return {
      eventHash,
      status: "accepted",
      missingContentHashes: [],
    };
  }

  /**
   * 署名済みイベントバイナリ（Base64）を追加し、`EventHashId` を返す
   */
  async submitEvent(
    eventBinaryBase64: string,
    eventType = "module_commit",
    env?: Env,
  ): Promise<string> {
    const res = await this.submitEventWithStatus(
      eventBinaryBase64,
      eventType,
      env,
    );
    return res.eventHash;
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

    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      const existing = new Set<string>();
      for (let i = 0; i < hashes.length; i += D1_BATCH_CHUNK_SIZE) {
        const chunk = hashes.slice(i, i + D1_BATCH_CHUNK_SIZE);
        const placeholders = chunk.map(() => "?").join(", ");
        const res = await env.DB.prepare(
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

    return hashes.filter((h) => !this.contents.has(h));
  }

  /**
   * CAS にコンテンツを保存し、保存したハッシュ一覧を返す
   */
  async uploadContent(
    items: ReadonlyArray<ContentItemInput>,
    env?: Env,
  ): Promise<ReadonlyArray<string>> {
    const nextContents = new Map<string, string>(this.contents);
    const stored: string[] = [];
    const d1Statements: D1PreparedStatement[] = [];

    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
    }

    for (const item of items) {
      const hash = item.contentHash ?? item.content_hash ?? item.hash ?? "";
      const bytes = item.contentBytes ?? item.content_bytes ?? item.content ??
        "";
      if (hash && bytes) {
        nextContents.set(hash, bytes);
        stored.push(hash);
        if (env?.DB) {
          d1Statements.push(
            env.DB.prepare(
              `INSERT OR REPLACE INTO cas_contents (content_hash, content_bytes)
               VALUES (?, ?)`,
            ).bind(hash, bytes),
          );
        }
      }
    }

    if (env?.DB && d1Statements.length > 0) {
      for (let i = 0; i < d1Statements.length; i += D1_BATCH_CHUNK_SIZE) {
        const chunk = d1Statements.slice(i, i + D1_BATCH_CHUNK_SIZE);
        await env.DB.batch(chunk);
      }
    }

    this.contents = nextContents;
    return stored;
  }

  /**
   * 指定された単一ハッシュに対応する CAS コンテンツを取得する
   */
  async getContentItem(
    hash: string,
    env?: Env,
  ): Promise<ContentItem | undefined> {
    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      const row = await env.DB.prepare(
        `SELECT content_hash, content_bytes FROM cas_contents WHERE content_hash = ?`,
      )
        .bind(hash)
        .first<D1ContentRow>();
      if (!row) {
        return undefined;
      }
      return {
        contentHash: row.content_hash,
        contentBytes: row.content_bytes,
      };
    }

    const contentBytes = this.contents.get(hash);
    if (contentBytes === undefined) {
      return undefined;
    }
    return { contentHash: hash, contentBytes };
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

    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      const byHash = new Map<string, string>();
      for (let i = 0; i < hashes.length; i += D1_BATCH_CHUNK_SIZE) {
        const chunk = hashes.slice(i, i + D1_BATCH_CHUNK_SIZE);
        const placeholders = chunk.map(() => "?").join(", ");
        const res = await env.DB.prepare(
          `SELECT content_hash, content_bytes FROM cas_contents WHERE content_hash IN (${placeholders})`,
        )
          .bind(...chunk)
          .all<D1ContentRow>();
        for (const row of res.results) {
          byHash.set(row.content_hash, row.content_bytes);
        }
      }
      const items: ContentItem[] = [];
      for (const h of hashes) {
        const b64 = byHash.get(h);
        if (b64 !== undefined) {
          items.push({ contentHash: h, contentBytes: b64 });
        }
      }
      return items;
    }

    const result: ContentItem[] = [];
    for (const h of hashes) {
      const contentBytes = this.contents.get(h);
      if (contentBytes !== undefined) {
        result.push({ contentHash: h, contentBytes });
      }
    }
    return result;
  }

  /**
   * 指定されたハッシュの CAS コンテンツを生バイト列として取得する
   */
  async getRawContentBytes(
    hash: string,
    env?: Env,
  ): Promise<Uint8Array | undefined> {
    const item = await this.getContentItem(hash, env);
    if (!item) {
      return undefined;
    }
    return base64ToBytes(item.contentBytes);
  }

  /**
   * デプロイ履歴を記録する
   */
  async recordDeployment(
    item: DeploymentHistoryItem,
    env?: Env,
  ): Promise<void> {
    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      await env.DB.prepare(
        `INSERT INTO deployments (machine_id, commit_hash, status, url, app_url, region, created_at_rfc3339, wasm_hash, provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          item.machineId,
          item.commitHash ?? null,
          item.status,
          item.url,
          item.appUrl,
          item.region,
          item.createdAtRfc3339,
          item.wasmHash ?? null,
          item.provider ?? null,
        )
        .run();
    }
    this.deployments = [item, ...this.deployments];
  }

  /**
   * デプロイ履歴一覧を取得する
   */
  async listDeployments(
    limit?: number | null,
    env?: Env,
  ): Promise<ReadonlyArray<DeploymentHistoryItem>> {
    const max = Math.min(100, Math.max(1, limit ?? 20));
    if (env?.DB) {
      await this.ensureD1Schema(env.DB);
      const res = await env.DB.prepare(
        `SELECT machine_id, commit_hash, status, url, app_url, region, created_at_rfc3339, wasm_hash, provider
         FROM deployments
         ORDER BY id DESC
         LIMIT ?`,
      )
        .bind(max)
        .all<D1DeploymentRow>();
      return res.results.map((r) => ({
        machineId: r.machine_id,
        commitHash: r.commit_hash,
        status: r.status,
        url: r.url,
        appUrl: r.app_url,
        region: r.region,
        createdAtRfc3339: r.created_at_rfc3339,
        wasmHash: r.wasm_hash,
        provider: r.provider,
      }));
    }
    return this.deployments.slice(0, max);
  }
}

export const defaultStore = new WorkerStore();

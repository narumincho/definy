/**
 * Cloudflare Workers Static Assets / D1 バインディングおよび環境変数の型定義
 */
export type Fetcher = {
  readonly fetch: (
    input: Request | URL | string,
    init?: RequestInit,
  ) => Promise<Response>;
};

export type D1Meta = {
  readonly changes?: number;
  readonly duration?: number;
  readonly last_row_id?: number;
};

export type D1Result<T = Record<string, unknown>> = {
  readonly results: ReadonlyArray<T>;
  readonly success: boolean;
  readonly meta?: D1Meta;
};

export type D1ExecResult = {
  readonly count: number;
  readonly duration: number;
};

export type D1PreparedStatement = {
  readonly bind: (...values: ReadonlyArray<unknown>) => D1PreparedStatement;
  readonly first: <T = Record<string, unknown>>(
    colName?: string,
  ) => Promise<T | null>;
  readonly run: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  readonly all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
};

export type D1Database = {
  readonly prepare: (query: string) => D1PreparedStatement;
  readonly batch: <T = Record<string, unknown>>(
    statements: ReadonlyArray<D1PreparedStatement>,
  ) => Promise<ReadonlyArray<D1Result<T>>>;
  readonly exec: (query: string) => Promise<D1ExecResult>;
};

export type Env = {
  readonly ASSETS?: Fetcher;
  readonly DB?: D1Database;
  /** 管理者アカウント ID（カンマ・空白区切りで複数可） */
  readonly DEFINY_ADMIN_ACCOUNT_IDS?: string;
};

/**
 * Connect-RPC EventItem (`proto/definy/v1/event.proto` の JSON マッピング)
 */
export type EventItem = {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs?: number;
};

/**
 * ビルド時にエクスポートされるシードバンドル (`__definy_seed_bundle.json`) の型定義
 */
export type SeedEventEntry = EventItem & {
  readonly timeMs: number;
};

export type SeedContentEntry = {
  readonly contentHash: string;
  readonly contentBytes: string;
};

export type SeedBundle = {
  /** `seedBundleFingerprint` (src/seed_fingerprint.ts). 無ければ読み込むときに計算する */
  readonly fingerprint?: string;
  readonly events: ReadonlyArray<SeedEventEntry>;
  readonly contents: ReadonlyArray<SeedContentEntry>;
};

/**
 * Connect-RPC: EventService メッセージ型 (Protobuf JSON マッピングに合わせ camelCase のみ受理)
 */
export type GetEventsRequest = {
  readonly eventType?: string | null;
  readonly limit?: number | null;
  readonly offset?: number | null;
};

export type GetEventsResponse = {
  readonly events: ReadonlyArray<EventItem>;
};

export type ProjectBranchItem = {
  readonly projectName: string;
  readonly branch: string;
  readonly creatorAccountId: string;
  readonly commitCount: number;
  readonly latestEvent: EventItem;
};

export type GetProjectBranchesResponse = {
  readonly branches: ReadonlyArray<ProjectBranchItem>;
};

export type SubmitEventResponse = {
  readonly eventHash: string;
  readonly status: "accepted" | "missing_content";
  readonly missingContentHashes: ReadonlyArray<string>;
};

export type ContentItem = {
  readonly contentHash: string;
  readonly contentBytes: string;
};

export type GetContentResponse = {
  readonly item?: ContentItem;
  readonly items?: ReadonlyArray<ContentItem>;
};

/**
 * Connect-RPC: HttpProxyService メッセージ型 (`proto/definy/v1/http_proxy.proto`).
 * ブラウザから CORS で直接送れない HTTP リクエストを, 許可されたアカウントのためにサーバーが仲介する
 */
export type HttpProxyHeader = {
  readonly name: string;
  readonly value: string;
};

export type HttpProxyFetchRequest = {
  readonly method?: string | null;
  readonly url?: string | null;
  readonly headers?: ReadonlyArray<HttpProxyHeader> | null;
  /** 本文 (標準 Base64) */
  readonly bodyBase64?: string | null;
};

export type HttpProxyFetchResponse = {
  readonly status: number;
  readonly headers: ReadonlyArray<HttpProxyHeader>;
  /** 本文 (標準 Base64) */
  readonly bodyBase64: string;
};

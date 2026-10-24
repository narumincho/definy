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
  /**
   * システムアカウントの公開鍵 (URL-safe base64). 型検査でコンパイラ組み込みのパーツを置けるモジュールを見分けるのに使う.
   * 未設定なら開発用の鍵 (docs/system-account.md)
   */
  readonly DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY?: string;
  /**
   * `HttpProxyService/Fetch` (CORS の仲介) を使えるアカウント ID (カンマ・空白区切りで複数可).
   * 管理者 (`DEFINY_ADMIN_ACCOUNT_IDS`) はいつでも使える
   */
  readonly DEFINY_HTTP_PROXY_ACCOUNT_IDS?: string;
  /**
   * `"true"` のとき `DebugService/SubmitUnverifiedEvent` で署名が不正なイベントも保存・配信できるようにする。
   * ブラウザ側の署名チェックを確認するためのローカル開発専用。本番では設定しない
   */
  readonly DEFINY_ALLOW_UNVERIFIED_EVENTS?: string;
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

export type GetEventRequest = {
  readonly eventHash?: string;
};

export type GetEventResponse = {
  readonly event?: EventItem;
};

export type SubmitEventRequest = {
  readonly signedEventBytes?: string;
};

export type SubmitEventResponse = {
  readonly eventHash: string;
  readonly status: "accepted" | "missing_content";
  readonly missingContentHashes: ReadonlyArray<string>;
};

export type CheckMissingHashesRequest = {
  readonly contentHashes?: ReadonlyArray<string>;
};

export type CheckMissingHashesResponse = {
  readonly missingContentHashes: ReadonlyArray<string>;
};

export type ContentItem = {
  readonly contentHash: string;
  readonly contentBytes: string;
};

export type UploadContentRequest = {
  readonly items?: ReadonlyArray<ContentItem>;
};

export type UploadContentResponse = {
  readonly storedContentHashes: ReadonlyArray<string>;
};

export type GetContentRequest = {
  readonly contentHash?: string;
  readonly contentHashes?: ReadonlyArray<string>;
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

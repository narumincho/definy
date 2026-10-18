/**
 * Cloudflare Workers Static Assets / D1 バインディングおよび環境変数の型定義
 */
export interface Fetcher {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

export interface D1Meta {
  readonly changes?: number;
  readonly duration?: number;
  readonly last_row_id?: number;
}

export interface D1Result<T = Record<string, unknown>> {
  readonly results: ReadonlyArray<T>;
  readonly success: boolean;
  readonly meta?: D1Meta;
}

export interface D1ExecResult {
  readonly count: number;
  readonly duration: number;
}

export interface D1PreparedStatement {
  bind(...values: ReadonlyArray<unknown>): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: ReadonlyArray<D1PreparedStatement>,
  ): Promise<ReadonlyArray<D1Result<T>>>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface Env {
  readonly ASSETS?: Fetcher;
  readonly DB?: D1Database;
  /** 管理者アカウント ID（カンマ・空白区切りで複数可） */
  readonly DEFINY_ADMIN_ACCOUNT_IDS?: string;
  readonly DEFINY_ROOT_DOMAIN?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
}

/**
 * Connect-RPC EventItem (`proto/definy/v1/event.proto` の JSON マッピング)
 */
export interface EventItem {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs?: number;
}

/**
 * ビルド時にエクスポートされるシードバンドル (`__definy_seed_bundle.json`) の型定義
 */
export interface SeedEventEntry extends EventItem {
  readonly timeMs: number;
}

export interface SeedContentEntry {
  readonly contentHash: string;
  readonly contentBytes: string;
}

export interface SeedBundle {
  readonly events: ReadonlyArray<SeedEventEntry>;
  readonly contents: ReadonlyArray<SeedContentEntry>;
}

/**
 * Connect-RPC: EventService メッセージ型 (Protobuf JSON マッピングに合わせ camelCase のみ受理)
 */
export interface GetEventsRequest {
  readonly eventType?: string | null;
  readonly limit?: number | null;
  readonly offset?: number | null;
}

export interface GetEventsResponse {
  readonly events: ReadonlyArray<EventItem>;
}

export interface GetEventRequest {
  readonly eventHash?: string;
}

export interface GetEventResponse {
  readonly event?: EventItem;
}

export interface SubmitEventRequest {
  readonly signedEventBytes?: string;
}

export interface SubmitEventResponse {
  readonly eventHash: string;
  readonly status: "accepted" | "missing_content";
  readonly missingContentHashes: ReadonlyArray<string>;
}

export interface CheckMissingHashesRequest {
  readonly contentHashes?: ReadonlyArray<string>;
}

export interface CheckMissingHashesResponse {
  readonly missingContentHashes: ReadonlyArray<string>;
}

export interface ContentItem {
  readonly contentHash: string;
  readonly contentBytes: string;
}

export interface UploadContentRequest {
  readonly items?: ReadonlyArray<ContentItem>;
}

export interface UploadContentResponse {
  readonly storedContentHashes: ReadonlyArray<string>;
}

export interface GetContentRequest {
  readonly contentHash?: string;
  readonly contentHashes?: ReadonlyArray<string>;
}

export interface GetContentResponse {
  readonly item?: ContentItem;
  readonly items?: ReadonlyArray<ContentItem>;
}

/**
 * Connect-RPC: DeployService メッセージ型
 */
export interface DeployCloudflareRequest {
  /** 省略時はサーバーの `CLOUDFLARE_API_TOKEN` を使う（管理者のみ） */
  readonly apiToken?: string | null;
  readonly accountId?: string | null;
  readonly scriptName?: string | null;
  readonly wasmHash?: string | null;
  readonly partId?: string | null;
  readonly customScript?: string | null;
  readonly commitHash?: string | null;
  /** D1 にシードを再投入する（管理者のみ） */
  readonly seedD1?: boolean | null;
}

export interface DeployCloudflareResponse {
  readonly scriptName: string;
  readonly status: string;
  readonly url: string;
  readonly evaluatedResult?: string | null;
}

export interface ListDeploymentsRequest {
  readonly limit?: number | null;
}

export interface DeploymentHistoryItem {
  readonly machineId: string;
  readonly commitHash?: string | null;
  readonly status: string;
  readonly url: string;
  readonly appUrl: string;
  readonly region: string;
  readonly createdAtRfc3339: string;
  readonly wasmHash?: string | null;
  readonly provider?: string | null;
}

export interface ListDeploymentsResponse {
  readonly deployments: ReadonlyArray<DeploymentHistoryItem>;
}

export interface ListCloudflareWorkersRequest {
  /** 省略時はサーバーの `CLOUDFLARE_API_TOKEN` を使う（管理者のみ） */
  readonly apiToken?: string | null;
  readonly accountId?: string | null;
}

export interface CloudflareWorkerItem {
  readonly id: string;
  readonly createdOn?: string;
  readonly modifiedOn?: string;
}

export interface ListCloudflareWorkersResponse {
  readonly workers: ReadonlyArray<CloudflareWorkerItem>;
}

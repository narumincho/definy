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
  readonly DEFINY_ROOT_DOMAIN?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
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
 * Connect-RPC: DeployService メッセージ型
 */
export type DeployCloudflareRequest = {
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
};

export type DeployCloudflareResponse = {
  readonly scriptName: string;
  readonly status: string;
  readonly url: string;
  readonly evaluatedResult?: string | null;
};

export type ListDeploymentsRequest = {
  readonly limit?: number | null;
};

export type DeploymentHistoryItem = {
  readonly machineId: string;
  readonly commitHash?: string | null;
  readonly status: string;
  readonly url: string;
  readonly appUrl: string;
  readonly region: string;
  readonly createdAtRfc3339: string;
  readonly wasmHash?: string | null;
  readonly provider?: string | null;
};

export type ListDeploymentsResponse = {
  readonly deployments: ReadonlyArray<DeploymentHistoryItem>;
};

export type ListCloudflareWorkersRequest = {
  /** 省略時はサーバーの `CLOUDFLARE_API_TOKEN` を使う（管理者のみ） */
  readonly apiToken?: string | null;
  readonly accountId?: string | null;
};

export type CloudflareWorkerItem = {
  readonly id: string;
  readonly createdOn?: string;
  readonly modifiedOn?: string;
};

export type ListCloudflareWorkersResponse = {
  readonly workers: ReadonlyArray<CloudflareWorkerItem>;
};

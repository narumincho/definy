/**
 * Cloudflare Workers Static Assets バインディングおよび環境変数の型定義
 */
export interface Fetcher {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

export interface Env {
  readonly ASSETS?: Fetcher;
  readonly DEFINY_ADMIN_ACCOUNT_ID?: string;
  readonly DEFINY_ADMIN_ACCOUNT_IDS?: string;
  readonly DEFINY_ROOT_DOMAIN?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
}

/**
 * Connect-RPC EventItem (`definy-event/src/rpc.rs` 準拠 camelCase)
 */
export interface EventItem {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
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
 * Connect-RPC: EventService メッセージ型 (camelCase & snake_case 双方の入力を受理)
 */
export interface GetEventsRequest {
  readonly eventType?: string | null;
  readonly event_type?: string | null;
  readonly limit?: number | null;
  readonly offset?: number | null;
}

export interface GetEventsResponse {
  readonly events: ReadonlyArray<EventItem>;
}

export interface GetEventRequest {
  readonly eventHash?: string;
  readonly event_hash?: string;
}

export interface GetEventResponse {
  readonly event?: EventItem;
}

export interface SubmitEventRequest {
  readonly signedEventBytes?: string;
  readonly signed_event_bytes?: string;
  readonly event_binary?: string;
}

export interface SubmitEventResponse {
  readonly eventHash: string;
  readonly status: string;
  readonly missingContentHashes: ReadonlyArray<string>;
}

export interface CheckMissingHashesRequest {
  readonly contentHashes?: ReadonlyArray<string>;
  readonly content_hashes?: ReadonlyArray<string>;
  readonly hashes?: ReadonlyArray<string>;
}

export interface CheckMissingHashesResponse {
  readonly missingContentHashes: ReadonlyArray<string>;
}

export interface ContentItemInput {
  readonly contentHash?: string;
  readonly content_hash?: string;
  readonly hash?: string;
  readonly contentBytes?: string;
  readonly content_bytes?: string;
  readonly content?: string;
}

export interface ContentItem {
  readonly contentHash: string;
  readonly contentBytes: string;
}

export interface UploadContentRequest {
  readonly items?: ReadonlyArray<ContentItemInput>;
}

export interface UploadContentResponse {
  readonly storedContentHashes: ReadonlyArray<string>;
}

export interface GetContentRequest {
  readonly contentHash?: string;
  readonly content_hash?: string;
  readonly hashes?: ReadonlyArray<string>;
}

export interface GetContentResponse {
  readonly item?: ContentItem;
  readonly items?: ReadonlyArray<ContentItem>;
}

/**
 * Connect-RPC: DeployService メッセージ型
 */
export interface DeployCloudflareRequest {
  readonly apiToken?: string | null;
  readonly api_token?: string | null;
  readonly accountId?: string | null;
  readonly account_id?: string | null;
  readonly scriptName?: string | null;
  readonly script_name?: string | null;
  readonly worker_name?: string | null;
  readonly wasmHash?: string | null;
  readonly wasm_hash?: string | null;
  readonly customScript?: string | null;
  readonly custom_script?: string | null;
  readonly commitHash?: string | null;
  readonly commit_hash?: string | null;
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
  readonly apiToken?: string | null;
  readonly api_token?: string | null;
  readonly accountId?: string | null;
  readonly account_id?: string | null;
}

export interface CloudflareWorkerItem {
  readonly id: string;
  readonly createdOn?: string;
  readonly modifiedOn?: string;
}

export interface ListCloudflareWorkersResponse {
  readonly workers: ReadonlyArray<CloudflareWorkerItem>;
}

/**
 * Connect-RPC: PreviewService メッセージ型
 */
export interface RegisterPreviewAppRequest {
  readonly appId?: string;
  readonly app_id?: string;
  readonly displayName?: string;
  readonly display_name?: string;
  readonly partId?: string;
  readonly part_id?: string;
  readonly accountId?: string;
  readonly account_id?: string;
  readonly signature?: string | null;
  readonly wasmHash?: string | null;
  readonly wasm_hash?: string | null;
}

export interface RegisterPreviewAppResponse {
  readonly appId: string;
  readonly previewUrl: string;
  readonly pathUrl: string;
  readonly status: string;
  readonly subdomain: string;
}

export interface ListPreviewAppsRequest {
  readonly accountId?: string | null;
  readonly account_id?: string | null;
}

export interface PreviewAppItem {
  readonly appId: string;
  readonly displayName: string;
  readonly partId: string;
  readonly previewUrl: string;
  readonly pathUrl: string;
  readonly ownerAccountId: string;
  readonly createdAtRfc3339: string;
  readonly status: string;
  readonly subdomain: string;
}

export interface ListPreviewAppsResponse {
  readonly apps: ReadonlyArray<PreviewAppItem>;
}

export interface StopPreviewAppRequest {
  readonly appId?: string;
  readonly app_id?: string;
  readonly accountId?: string;
  readonly account_id?: string;
  readonly signature?: string | null;
}

export interface StopPreviewAppResponse {
  readonly success: boolean;
  readonly message: string;
}

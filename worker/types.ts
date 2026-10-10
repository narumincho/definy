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
 * ビルド時にエクスポートされるシードバンドル (`__definy_seed_bundle.json`) の型定義
 */
export interface SeedEventEntry {
  readonly hash_hex: string;
  readonly event_type: string;
  readonly time_ms: number;
  readonly event_binary_base64: string;
}

export interface SeedContentEntry {
  readonly hash: string;
  readonly content_base64: string;
}

export interface SeedBundle {
  readonly events: ReadonlyArray<SeedEventEntry>;
  readonly contents: ReadonlyArray<SeedContentEntry>;
}

/**
 * Connect-RPC: EventService メッセージ型
 */
export interface GetEventsRequest {
  readonly event_type?: string | null;
  readonly limit?: number | null;
  readonly offset?: number | null;
}

export interface GetEventsResponse {
  readonly events: ReadonlyArray<string>;
}

export interface SubmitEventRequest {
  readonly event_binary?: string;
}

export interface SubmitEventResponse {
  readonly event_hash: string;
}

export interface CheckMissingHashesRequest {
  readonly hashes?: ReadonlyArray<string>;
}

export interface CheckMissingHashesResponse {
  readonly missing_hashes: ReadonlyArray<string>;
}

export interface ContentItem {
  readonly hash: string;
  readonly content: string;
}

export interface UploadContentRequest {
  readonly items?: ReadonlyArray<ContentItem>;
}

export interface UploadContentResponse {
  readonly saved_count: number;
}

export interface GetContentRequest {
  readonly hashes?: ReadonlyArray<string>;
}

export interface GetContentResponse {
  readonly items: ReadonlyArray<ContentItem>;
}

/**
 * Connect-RPC: DeployService メッセージ型
 */
export interface DeployCloudflareRequest {
  readonly commit_hash?: string | null;
  readonly wasm_hash?: string | null;
  readonly worker_name?: string | null;
  readonly account_id?: string | null;
  readonly api_token?: string | null;
}

export interface DeployCloudflareResponse {
  readonly deployment_id: string;
  readonly worker_name: string;
  readonly status: string;
  readonly url: string;
  readonly created_at: string;
  readonly wasm_hash?: string | null;
}

export interface ListDeploymentsRequest {
  readonly limit?: number | null;
}

export interface DeploymentHistoryItem {
  readonly machine_id: string;
  readonly status: string;
  readonly url: string;
  readonly app_url: string;
  readonly region: string;
  readonly created_at: string;
  readonly commit_hash?: string | null;
  readonly wasm_hash?: string | null;
  readonly provider?: string | null;
}

export interface ListDeploymentsResponse {
  readonly deployments: ReadonlyArray<DeploymentHistoryItem>;
}

export interface ListCloudflareWorkersRequest {
  readonly account_id?: string | null;
  readonly api_token?: string | null;
}

export interface CloudflareWorkerItem {
  readonly script_name: string;
  readonly created_on: string;
  readonly modified_on: string;
  readonly url: string;
}

export interface ListCloudflareWorkersResponse {
  readonly workers: ReadonlyArray<CloudflareWorkerItem>;
}

/**
 * Connect-RPC: PreviewService メッセージ型
 */
export interface RegisterPreviewAppRequest {
  readonly app_id?: string;
  readonly display_name?: string;
  readonly part_id?: string;
  readonly account_id?: string;
  readonly signature?: string | null;
  readonly wasm_hash?: string | null;
}

export interface RegisterPreviewAppResponse {
  readonly app_id: string;
  readonly preview_url: string;
  readonly path_url: string;
  readonly status: string;
  readonly created_at: string;
}

export interface ListPreviewAppsRequest {
  readonly account_id?: string | null;
}

export interface PreviewAppItem {
  readonly app_id: string;
  readonly display_name: string;
  readonly part_id: string;
  readonly owner_account_id: string;
  readonly preview_url: string;
  readonly path_url: string;
  readonly status: string;
  readonly created_at: string;
}

export interface ListPreviewAppsResponse {
  readonly apps: ReadonlyArray<PreviewAppItem>;
}

export interface StopPreviewAppRequest {
  readonly app_id?: string;
  readonly account_id?: string;
  readonly signature?: string | null;
}

export interface StopPreviewAppResponse {
  readonly app_id: string;
  readonly success: boolean;
}

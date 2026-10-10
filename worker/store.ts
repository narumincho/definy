import type {
  ContentItem,
  DeploymentHistoryItem,
  Env,
  GetEventsRequest,
  PreviewAppItem,
  SeedBundle,
  SeedEventEntry,
} from "./types.ts";

/**
 * Base64 文字列を Uint8Array にデコードする
 */
export function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binString = atob(padded);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uint8Array を標準 Base64 文字列にエンコードする
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binString = "";
  for (let i = 0; i < bytes.length; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString);
}

/**
 * Uint8Array の SHA-256 ダイジェスト（小文字 hex 64文字）を計算する
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  const hashArray = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Cloudflare Worker 内でイベント・CAS コンテンツ・デプロイ履歴・プレビューアプリを管理するストア
 */
export class WorkerStore {
  private seeded = false;
  private events: ReadonlyArray<SeedEventEntry> = [];
  private eventHashes: ReadonlySet<string> = new Set<string>();
  private contents: ReadonlyMap<string, string> = new Map<string, string>();
  private deployments: ReadonlyArray<DeploymentHistoryItem> = [];
  private previewApps: ReadonlyMap<string, PreviewAppItem> = new Map<
    string,
    PreviewAppItem
  >();

  /**
   * Static Assets バインディングから `__definy_seed_bundle.json` を一度だけロードする
   */
  async ensureSeeded(env: Env): Promise<void> {
    if (this.seeded) {
      return;
    }
    this.seeded = true;
    if (!env.ASSETS) {
      return;
    }
    try {
      const res = await env.ASSETS.fetch(
        new Request("https://internal/__definy_seed_bundle.json"),
      );
      if (res.ok) {
        const bundle = (await res.json()) as SeedBundle;
        this.loadSeedBundle(bundle);
      }
    } catch {
      // Static Assets にシードバンドルが存在しない環境（単体テスト等）では空ストアのまま動作
    }
  }

  /**
   * シードバンドルをストアに反映する
   */
  loadSeedBundle(bundle: SeedBundle): void {
    this.seeded = true;
    const nextHashes = new Set<string>(this.eventHashes);
    const mergedEvents: SeedEventEntry[] = [...this.events];

    for (const ev of bundle.events) {
      if (!nextHashes.has(ev.hash_hex)) {
        nextHashes.add(ev.hash_hex);
        mergedEvents.push(ev);
      }
    }
    mergedEvents.sort((a, b) => b.time_ms - a.time_ms);
    this.events = mergedEvents;
    this.eventHashes = nextHashes;

    const nextContents = new Map<string, string>(this.contents);
    for (const item of bundle.contents) {
      nextContents.set(item.hash, item.content_base64);
    }
    this.contents = nextContents;
  }

  /**
   * イベント一覧を取得する（`time_ms` 降順）
   */
  getEvents(req: GetEventsRequest): ReadonlyArray<string> {
    let filtered = this.events;
    if (req.event_type) {
      filtered = filtered.filter((e) => e.event_type === req.event_type);
    }
    const offset = Math.max(0, req.offset ?? 0);
    const limit = Math.min(500, Math.max(1, req.limit ?? 50));
    return filtered
      .slice(offset, offset + limit)
      .map((e) => e.event_binary_base64);
  }

  /**
   * 署名済みイベントバイナリ（Base64）を追加し、SHA-256 ハッシュを返す
   */
  async submitEvent(
    eventBinaryBase64: string,
    eventType = "ModuleCommit",
  ): Promise<string> {
    const bytes = base64ToBytes(eventBinaryBase64);
    const hashHex = await sha256Hex(bytes);

    if (!this.eventHashes.has(hashHex)) {
      const nextHashes = new Set<string>(this.eventHashes);
      nextHashes.add(hashHex);
      const entry: SeedEventEntry = {
        hash_hex: hashHex,
        event_type: eventType,
        time_ms: Date.now(),
        event_binary_base64: bytesToBase64(bytes),
      };
      this.events = [entry, ...this.events];
      this.eventHashes = nextHashes;
    }

    return hashHex;
  }

  /**
   * 指定されたハッシュ一覧のうち、CAS に未保存のハッシュ一覧を返す
   */
  checkMissingHashes(hashes: ReadonlyArray<string>): ReadonlyArray<string> {
    return hashes.filter((h) => !this.contents.has(h));
  }

  /**
   * CAS にコンテンツを保存する
   */
  uploadContent(items: ReadonlyArray<ContentItem>): number {
    const nextContents = new Map<string, string>(this.contents);
    let saved = 0;
    for (const item of items) {
      if (item.hash && item.content) {
        nextContents.set(item.hash, item.content);
        saved++;
      }
    }
    this.contents = nextContents;
    return saved;
  }

  /**
   * 指定されたハッシュ一覧に対応する CAS コンテンツを取得する
   */
  getContent(hashes: ReadonlyArray<string>): ReadonlyArray<ContentItem> {
    const result: ContentItem[] = [];
    for (const h of hashes) {
      const content = this.contents.get(h);
      if (content !== undefined) {
        result.push({ hash: h, content });
      }
    }
    return result;
  }

  /**
   * 指定されたハッシュの CAS コンテンツを生バイト列として取得する
   */
  getRawContentBytes(hash: string): Uint8Array | undefined {
    const b64 = this.contents.get(hash);
    if (b64 === undefined) {
      return undefined;
    }
    return base64ToBytes(b64);
  }

  /**
   * デプロイ履歴を記録する
   */
  recordDeployment(item: DeploymentHistoryItem): void {
    this.deployments = [item, ...this.deployments];
  }

  /**
   * デプロイ履歴一覧を取得する
   */
  listDeployments(
    limit?: number | null,
  ): ReadonlyArray<DeploymentHistoryItem> {
    const max = Math.min(100, Math.max(1, limit ?? 20));
    return this.deployments.slice(0, max);
  }

  /**
   * プレビューアプリを登録または更新する
   */
  registerPreviewApp(app: PreviewAppItem): void {
    const next = new Map<string, PreviewAppItem>(this.previewApps);
    next.set(app.app_id, app);
    this.previewApps = next;
  }

  /**
   * プレビューアプリを取得する
   */
  getPreviewApp(appId: string): PreviewAppItem | undefined {
    return this.previewApps.get(appId);
  }

  /**
   * プレビューアプリ一覧を取得する
   */
  listPreviewApps(
    accountId?: string | null,
  ): ReadonlyArray<PreviewAppItem> {
    const all = Array.from(this.previewApps.values());
    if (accountId && accountId.trim().length > 0) {
      const normalized = accountId.trim().toLowerCase();
      return all.filter(
        (a) => a.owner_account_id.toLowerCase() === normalized,
      );
    }
    return all;
  }

  /**
   * プレビューアプリを停止・削除する
   */
  stopPreviewApp(appId: string): boolean {
    if (!this.previewApps.has(appId)) {
      return false;
    }
    const next = new Map<string, PreviewAppItem>(this.previewApps);
    next.delete(appId);
    this.previewApps = next;
    return true;
  }
}

export const defaultStore = new WorkerStore();

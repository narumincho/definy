import type {
  ContentItem,
  ContentItemInput,
  DeploymentHistoryItem,
  Env,
  EventItem,
  GetEventsRequest,
  PreviewAppItem,
  SeedBundle,
  SeedEventEntry,
} from "./types.ts";

/**
 * Base64 文字列（標準 / URL-safe / パディング省略すべて対応）を Uint8Array にデコードする
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
 * Uint8Array を URL-safe Base64 (パディングなし) にエンコードする
 */
export function bytesToUrlSafeBase64NoPad(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Uint8Array の SHA-256 ダイジェストを計算し、URL-safe Base64 (`EventHashId` 形式) を返す
 */
export async function sha256EventHashId(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return bytesToUrlSafeBase64NoPad(new Uint8Array(digest));
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
  async ensureSeeded(env: Env, requestOrigin?: string): Promise<void> {
    if (this.seeded) {
      return;
    }
    const origin = requestOrigin || "https://definy.narumincho.workers.dev";
    const assetUrl = new URL("/__definy_seed_bundle.json", origin).toString();

    if (env.ASSETS) {
      try {
        const res = await env.ASSETS.fetch(new Request(assetUrl));
        if (res.ok) {
          const bundle = (await res.json()) as SeedBundle;
          this.loadSeedBundle(bundle);
          return;
        }
      } catch {
        // Static Assets 取得失敗時は下のフォールバックを試行
      }
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
  getEvents(req: GetEventsRequest): ReadonlyArray<EventItem> {
    let filtered = this.events;
    const requestedType = req.eventType ?? req.event_type;
    if (requestedType) {
      const normalized = requestedType.toLowerCase().replace(/_/g, "");
      filtered = filtered.filter(
        (e) => e.eventType.toLowerCase().replace(/_/g, "") === normalized,
      );
    }
    const offset = Math.max(0, req.offset ?? 0);
    const limit = Math.min(500, Math.max(1, req.limit ?? 50));
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
  getEvent(eventHash: string): EventItem | undefined {
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
   * 署名済みイベントバイナリ（Base64）を追加し、`EventHashId` を返す
   */
  async submitEvent(
    eventBinaryBase64: string,
    eventType = "module_commit",
  ): Promise<string> {
    const bytes = base64ToBytes(eventBinaryBase64);
    const eventHash = await sha256EventHashId(bytes);

    if (!this.eventHashes.has(eventHash)) {
      const nextHashes = new Set<string>(this.eventHashes);
      nextHashes.add(eventHash);
      const now = new Date();
      const entry: SeedEventEntry = {
        eventHash,
        signedEventBytes: bytesToBase64(bytes),
        accountId: "",
        eventType,
        createdAtRfc3339: now.toISOString(),
        timeMs: now.getTime(),
      };
      this.events = [entry, ...this.events];
      this.eventHashes = nextHashes;
    }

    return eventHash;
  }

  /**
   * 指定されたハッシュ一覧のうち、CAS に未保存のハッシュ一覧を返す
   */
  checkMissingHashes(hashes: ReadonlyArray<string>): ReadonlyArray<string> {
    return hashes.filter((h) => !this.contents.has(h));
  }

  /**
   * CAS にコンテンツを保存し、保存したハッシュ一覧を返す
   */
  uploadContent(
    items: ReadonlyArray<ContentItemInput>,
  ): ReadonlyArray<string> {
    const nextContents = new Map<string, string>(this.contents);
    const stored: string[] = [];
    for (const item of items) {
      const hash = item.contentHash ?? item.content_hash ?? item.hash ?? "";
      const bytes = item.contentBytes ?? item.content_bytes ?? item.content ??
        "";
      if (hash && bytes) {
        nextContents.set(hash, bytes);
        stored.push(hash);
      }
    }
    this.contents = nextContents;
    return stored;
  }

  /**
   * 指定された単一ハッシュに対応する CAS コンテンツを取得する
   */
  getContentItem(hash: string): ContentItem | undefined {
    const contentBytes = this.contents.get(hash);
    if (contentBytes === undefined) {
      return undefined;
    }
    return { contentHash: hash, contentBytes };
  }

  /**
   * 指定されたハッシュ一覧に対応する CAS コンテンツを取得する
   */
  getContentItems(hashes: ReadonlyArray<string>): ReadonlyArray<ContentItem> {
    const result: ContentItem[] = [];
    for (const h of hashes) {
      const item = this.getContentItem(h);
      if (item !== undefined) {
        result.push(item);
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
    next.set(app.appId, app);
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
        (a) => a.ownerAccountId.toLowerCase() === normalized,
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

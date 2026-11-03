/**
 * definy サーバーへのクライアント (docs/mcp.md).
 * サーバーを信用せず、受け取ったイベントは全て署名検証し (`verifyEventRecord`)、
 * パーツの中身はコンテンツハッシュと SHA-256 が一致するものだけを使う。
 * 検証に失敗したイベントの中身は決して返さない
 */
import {
  createSignedAccountEvent,
  createSignedProjectCommitEvent,
  submitProjectCommitEvent,
  submitSignedEvent,
  type AccountCredentials,
  type CommitModuleParams,
} from "../src/auth.ts";
import { base64ToBytes } from "../src/base64.ts";
import { decodeCborItem } from "../src/cbor.ts";
import {
  extractProjectCommit,
  type DecodedProjectCommit,
} from "../src/decoded_event.ts";
import type { PartContent } from "../src/event_content.ts";
import { decodePartDefinition } from "../src/part_definition.ts";
import {
  verifyEventRecord,
  type EventVerification,
  type UnverifiedEventRecord,
} from "../src/signed_event.ts";
import { sha256EventHashIdSync } from "../src/sha256.ts";

/** definy サーバーが返すイベント 1 件 (検証前) */
type EventItem = UnverifiedEventRecord & {
  readonly createdAtRfc3339?: string;
};

export type VerifiedEvent = {
  readonly eventHash: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly timeMs: number;
  readonly verification: EventVerification;
  /** 検証に成功したときだけ、デコードしたコミット (project_commit のとき) */
  readonly commit: DecodedProjectCommit | null;
};

export type VerifiedBranch = {
  readonly projectName: string;
  readonly branch: string;
  readonly creatorAccountId: string;
  readonly commitCount: number;
  readonly latestEvent: VerifiedEvent;
};

/** 中身まで解決したパーツ */
export type ResolvedPart = {
  readonly name: string;
  readonly partIdHash: string | null;
  readonly contentHash: string | null;
  /** CAS から解決できた中身。定義の式をその場で評価できないものは `null` */
  readonly content: PartContent | null;
};

export type ProjectSnapshot = {
  readonly projectName: string;
  readonly branch: string;
  readonly eventHash: string;
  readonly accountId: string;
  readonly timeMs: number;
  readonly message: string;
  readonly parentCommitHash: string | null;
  readonly mergedCommitHash: string | null;
  readonly projectDescription: DecodedProjectCommit["projectDescription"];
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly description: DecodedProjectCommit["modules"][number]["description"];
    readonly visibility: string;
    readonly parts: ReadonlyArray<ResolvedPart>;
  }>;
};

export class DefinyClient {
  readonly #baseUrl: string;
  readonly #fetchFn: typeof fetch;

  constructor(params: {
    readonly baseUrl: string;
    readonly fetchFn?: typeof fetch;
  }) {
    this.#baseUrl = params.baseUrl.replace(/\/$/, "");
    this.#fetchFn = params.fetchFn ?? fetch;
  }

  async #rpc<T>(method: string, body: unknown): Promise<T> {
    const res = await this.#fetchFn(
      `${this.#baseUrl}/definy.v1.EventService/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      throw new Error(`${method} failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  async #verify(item: EventItem): Promise<VerifiedEvent> {
    const verification = await verifyEventRecord(item);
    return {
      eventHash: item.eventHash,
      accountId: item.accountId,
      eventType: item.eventType,
      timeMs: item.timeMs,
      verification,
      commit:
        verification.status === "valid"
          ? extractProjectCommit(item.signedEventBytes)
          : null,
    };
  }

  /** 全プロジェクトの全ブランチ。最新コミットは検証済み */
  async listBranches(): Promise<ReadonlyArray<VerifiedBranch>> {
    const res = await this.#rpc<{
      readonly branches?: ReadonlyArray<{
        readonly projectName: string;
        readonly branch: string;
        readonly creatorAccountId: string;
        readonly commitCount: number;
        readonly latestEvent: EventItem;
      }>;
    }>("GetProjectBranches", {});
    return await Promise.all(
      (res.branches ?? []).map(async (b) => ({
        projectName: b.projectName,
        branch: b.branch,
        creatorAccountId: b.creatorAccountId,
        commitCount: b.commitCount,
        latestEvent: await this.#verify(b.latestEvent),
      })),
    );
  }

  /** イベントの一覧 (新しい順)。それぞれ検証状態付き */
  async listEvents(params: {
    readonly eventType?: string | undefined;
    readonly limit?: number | undefined;
    readonly offset?: number | undefined;
  }): Promise<ReadonlyArray<VerifiedEvent>> {
    const res = await this.#rpc<{ readonly events?: ReadonlyArray<EventItem> }>(
      "GetEvents",
      {
        ...(params.eventType !== undefined
          ? { eventType: params.eventType }
          : {}),
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      },
    );
    return await Promise.all((res.events ?? []).map((e) => this.#verify(e)));
  }

  /** イベント 1 件。無ければ `null` */
  async getEvent(eventHash: string): Promise<VerifiedEvent | null> {
    const res = await this.#rpc<{ readonly event?: EventItem }>("GetEvent", {
      eventHash,
    });
    return res.event === undefined ? null : await this.#verify(res.event);
  }

  /**
   * コンテンツハッシュからパーツの中身を引く。
   * バイト列の SHA-256 がハッシュと一致するものだけをデコードする
   */
  async getPartContents(
    hashes: ReadonlyArray<string>,
  ): Promise<ReadonlyMap<string, PartContent | null>> {
    const result = new Map<string, PartContent | null>();
    if (hashes.length === 0) return result;
    const res = await this.#rpc<{
      readonly items?: ReadonlyArray<{
        readonly contentHash: string;
        readonly contentBytes: string;
      }>;
    }>("GetContent", { contentHashes: hashes });
    for (const item of res.items ?? []) {
      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(item.contentBytes);
      } catch {
        continue;
      }
      if (sha256EventHashIdSync(bytes) !== item.contentHash) continue;
      const [definition] = decodeCborItem(bytes);
      result.set(item.contentHash, decodePartDefinition(definition) ?? null);
    }
    return result;
  }

  /** `src/auth.ts` の送信系が使う相対 URL を、このクライアントの接続先に解決する fetch */
  #boundFetch: typeof fetch = (input, init) => {
    const url =
      typeof input === "string" && input.startsWith("/")
        ? `${this.#baseUrl}${input}`
        : input;
    return this.#fetchFn(url, init);
  };

  /** プロジェクトの 1 ブランチを正確に引く。無ければ `undefined` */
  async getBranch(
    projectName: string,
    branchName: string,
  ): Promise<VerifiedBranch | undefined> {
    const branches = await this.listBranches();
    return branches.find(
      (b) => b.projectName === projectName && b.branch === branchName,
    );
  }

  /** プロジェクトが存在するか (ブランチが 1 つでもあるか) */
  async projectExists(projectName: string): Promise<boolean> {
    const branches = await this.listBranches();
    return branches.some((b) => b.projectName === projectName);
  }

  /**
   * アカウント作成イベントを探す。`GetEvents` にはアカウントでの絞り込みが無いので、
   * create_account イベントを走査する (ページ数の上限あり)
   */
  async findAccountEvent(accountId: string): Promise<VerifiedEvent | null> {
    for (let page = 0; page < 5; page++) {
      const events = await this.listEvents({
        eventType: "create_account",
        limit: 100,
        offset: page * 100,
      });
      const found = events.find((e) => e.accountId === accountId);
      if (found !== undefined) return found;
      if (events.length < 100) break;
    }
    return null;
  }

  /** アカウント作成イベントを署名して送る */
  async submitAccountCreation(
    credentials: AccountCredentials,
  ): Promise<{ readonly eventHash: string; readonly status: string }> {
    const signed = await createSignedAccountEvent(credentials);
    return await submitSignedEvent(signed.signedEventBytes, this.#boundFetch);
  }

  /**
   * プロジェクトのコミットを署名して送る。パーツの中身がサーバーに無ければ
   * `UploadContent` で送ってから出し直す (`submitProjectCommitEvent`)。
   * 受け付けられると status は `accepted`、拒否されると理由の文字列が返る
   */
  async submitCommit(params: {
    readonly credentials: AccountCredentials;
    readonly projectName: string;
    readonly branch: string;
    readonly projectDescription: ReadonlyArray<{
      readonly language: string;
      readonly text: string;
    }>;
    readonly message: string;
    readonly parentCommitHash: string | null;
    readonly modules: ReadonlyArray<CommitModuleParams>;
  }): Promise<{ readonly eventHash: string; readonly status: string }> {
    const signed = await createSignedProjectCommitEvent({
      credentials: params.credentials,
      projectName: params.projectName,
      branch: params.branch,
      projectDescription: params.projectDescription,
      message: params.message,
      parentCommitHash: params.parentCommitHash,
      mergedCommitHash: null,
      modules: params.modules,
    });
    return await submitProjectCommitEvent(
      signed.signedEventBytes,
      signed.contents,
      this.#boundFetch,
    );
  }

  /**
   * プロジェクトのブランチの最新コミットの内容。
   * ブランチが無い、または最新コミットの検証に失敗したら `null`
   * (検証に失敗した場合は `listBranches` 側で検証状態が見える)
   */
  async getProjectSnapshot(
    projectName: string,
    branchName?: string,
  ): Promise<ProjectSnapshot | null> {
    const branches = await this.listBranches();
    const branch =
      branches.find(
        (b) => b.projectName === projectName && b.branch === branchName,
      ) ??
      branches.find(
        (b) => b.projectName === projectName && b.branch === "main",
      ) ??
      branches.find((b) => b.projectName === projectName);
    if (branch === undefined) return null;
    const { latestEvent } = branch;
    if (latestEvent.verification.status !== "valid") return null;
    const commit = latestEvent.commit;
    if (commit === null) return null;

    const hashes = commit.modules.flatMap((m) =>
      m.parts.flatMap((p) => (p.contentHash != null ? [p.contentHash] : [])),
    );
    const contents = await this.getPartContents([...new Set(hashes)]);
    return {
      projectName: commit.projectName,
      branch: commit.branch,
      eventHash: latestEvent.eventHash,
      accountId: latestEvent.accountId,
      timeMs: latestEvent.timeMs,
      message: commit.message,
      parentCommitHash: commit.parentCommitHash,
      mergedCommitHash: commit.mergedCommitHash,
      projectDescription: commit.projectDescription,
      modules: commit.modules.map((m) => ({
        name: m.name,
        description: m.description,
        visibility: m.visibility,
        parts: m.parts.map((p) => ({
          name: p.name,
          partIdHash: p.partIdHash ?? null,
          contentHash: p.contentHash ?? null,
          content:
            p.contentHash != null
              ? (contents.get(p.contentHash) ?? null)
              : null,
        })),
      })),
    };
  }
}

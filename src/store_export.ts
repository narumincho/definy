/**
 * definy サーバーのストアから `seeds/store/` に書き出すものを集める (`npm run export:store`. docs/source-in-store.md).
 *
 * 書き出すのは, アカウント `accountId` が `main` の作成者のプロジェクト `projects` の `main` の最新のコミットと,
 * そこから親 (と取り込んだコミット) をたどった全てのコミット, その作者のアカウントの作成, コミットのパーツの中身
 */
import { base64ToBytes } from "./base64.ts";
import { MAIN_BRANCH, type ProjectCommitContent } from "./event_content.ts";
import { sha256EventHashIdSync } from "./sha256.ts";
import { decodeVerifiedSignedEvent } from "./signed_event.ts";
import type { StoreSeedData } from "./store_seed.ts";
import type {
  ContentItem,
  GetContentResponse,
  GetEventsResponse,
} from "../worker/types.ts";

const PAGE_SIZE = 500;
const CONTENT_CHUNK_SIZE = 200;

export type ExportStoreOptions = {
  /** definy サーバーのベース URL (例: `http://127.0.0.1:8787`) */
  readonly baseUrl: string;
  /** `main` の作成者のアカウント ID (URL-safe Base64) */
  readonly accountId: string;
  /** 書き出すプロジェクトの名前 */
  readonly projects: ReadonlyArray<string>;
  readonly fetchFn?: typeof fetch;
};

type DecodedEvent = {
  readonly hash: string;
  readonly bytes: Uint8Array;
  readonly accountId: string;
  readonly timeMs: number;
  readonly commit: ProjectCommitContent | undefined;
  readonly isCreateAccount: boolean;
};

async function postRpc<T>(
  fetchFn: typeof fetch,
  baseUrl: string,
  method: string,
  body: unknown,
): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, "")}/definy.v1.EventService/${method}`;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `${url} returned ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as T;
}

/** サーバーの全てのイベントを読み, 署名の正しいものだけを返す */
async function readAllEvents(
  fetchFn: typeof fetch,
  baseUrl: string,
): Promise<ReadonlyArray<DecodedEvent>> {
  const result: Array<DecodedEvent> = [];
  for (let offset = 0; ;) {
    const response = await postRpc<GetEventsResponse>(
      fetchFn,
      baseUrl,
      "GetEvents",
      { limit: PAGE_SIZE, offset },
    );
    for (const item of response.events) {
      const bytes = base64ToBytes(item.signedEventBytes);
      let decoded;
      try {
        decoded = await decodeVerifiedSignedEvent(bytes);
      } catch {
        continue;
      }
      result.push({
        hash: sha256EventHashIdSync(bytes),
        bytes,
        accountId: decoded.meta.accountId,
        timeMs: decoded.meta.timeMs,
        commit:
          decoded.content.type === "project_commit"
            ? decoded.content.commit
            : undefined,
        isCreateAccount: decoded.content.type === "create_account",
      });
    }
    if (response.events.length < PAGE_SIZE) {
      break;
    }
    offset += response.events.length;
  }
  return result;
}

/** 書き出すものを集める. `heads` はプロジェクトの `main` の最新のコミット */
export async function exportStoreSeed(
  options: ExportStoreOptions,
): Promise<StoreSeedData> {
  const fetchFn = options.fetchFn ?? fetch;
  const events = await readAllEvents(fetchFn, options.baseUrl);
  const byHash = new Map(events.map((event) => [event.hash, event]));

  const heads: Record<string, string> = {};
  for (const projectName of options.projects) {
    const latest = events
      .filter(
        (event) =>
          event.accountId === options.accountId &&
          event.commit?.projectName === projectName &&
          event.commit.branch === MAIN_BRANCH,
      )
      .reduce<DecodedEvent | undefined>(
        (a, b) => (a === undefined || b.timeMs > a.timeMs ? b : a),
        undefined,
      );
    if (latest === undefined) {
      throw new Error(
        `${projectName}: no main commit by ${options.accountId} on ${options.baseUrl}`,
      );
    }
    heads[projectName] = latest.hash;
  }

  // 親と取り込んだコミットをたどる
  const commits = new Map<string, DecodedEvent>();
  const pending = Object.values(heads);
  while (pending.length > 0) {
    const hash = pending.pop() ?? "";
    if (commits.has(hash)) {
      continue;
    }
    const event = byHash.get(hash);
    if (event?.commit === undefined) {
      throw new Error(`the commit ${hash} is missing on ${options.baseUrl}`);
    }
    commits.set(hash, event);
    for (const next of [
      event.commit.parentCommitHash,
      event.commit.mergedCommitHash,
    ]) {
      if (next !== null) {
        pending.push(next);
      }
    }
  }

  const authors = new Set([...commits.values()].map((e) => e.accountId));
  const accountEvents = events.filter(
    (event) => event.isCreateAccount && authors.has(event.accountId),
  );

  const contentHashes = new Set<string>();
  for (const event of commits.values()) {
    for (const module of event.commit?.modules ?? []) {
      for (const part of module.parts) {
        if (part.contentHash !== null) {
          contentHashes.add(part.contentHash);
        }
      }
    }
  }
  const contents: Array<Uint8Array> = [];
  const hashes = [...contentHashes].sort();
  for (let i = 0; i < hashes.length; i += CONTENT_CHUNK_SIZE) {
    const chunk = hashes.slice(i, i + CONTENT_CHUNK_SIZE);
    const response = await postRpc<GetContentResponse>(
      fetchFn,
      options.baseUrl,
      "GetContent",
      { contentHashes: chunk },
    );
    const found = new Map<string, ContentItem>(
      (response.items ?? []).map((item) => [item.contentHash, item]),
    );
    for (const hash of chunk) {
      const item = found.get(hash);
      const bytes =
        item === undefined ? undefined : base64ToBytes(item.contentBytes);
      if (bytes === undefined || sha256EventHashIdSync(bytes) !== hash) {
        throw new Error(`the content ${hash} is missing on ${options.baseUrl}`);
      }
      contents.push(bytes);
    }
  }

  return {
    events: [...accountEvents, ...commits.values()].map((e) => e.bytes),
    contents,
    heads: { projects: heads },
  };
}

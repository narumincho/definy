/**
 * サーバーの RPC の処理を definy 製の `definy.handle-rpc` で動かす (docs/service.md).
 *
 * `definy.handle-rpc` は `npm run build:seeds` が stage1 でコンパイルした `wasm/service.wasm` を使う
 * (Cloudflare Workers は実行時に Wasm をコンパイルできない). 処理は `definy.service-io` の値を返し,
 * ストアを読む要求 (`read_commits` / `read_events`) や書き込みの要求 (`write_event` / `write_contents`) をホスト (ここ) が
 * 行って結果を `then` に渡す. イベントを受け付ける規則 (`core.check-event`) も `definy.submit-event` の中で呼ぶ. 処理は決めるだけで, できることはホストが渡す能力で決まる (wasi.io と同じ考え方. docs/wasi-io.md)
 */
import { none, some, variant, variantOf } from "../src/definy_value.ts";
import { encodeEventContent, type EventContent } from "../src/event_content.ts";
import {
  commitSummaryLiteral,
  type CommitSummary,
} from "../src/event_check.ts";
import {
  instantiateCompiledFunction,
  type DefinyValue,
} from "../src/stage1_compiler.ts";
import type { ContentItem, EventItem } from "./types.ts";

/** 処理がストアを読むときに使うもの */
export type ServiceIoHost = {
  /** 受け付けたプロジェクトのコミット (ストアの順) */
  readonly readCommits: () => Promise<ReadonlyArray<CommitSummary>>;
  /** そのハッシュの保存しているイベント (同じ順. 無ければ `undefined`) */
  readonly readEvents: (
    eventHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<EventItem | undefined>>;
  /** 保存しているイベントの 1 ページ (新しい順. `eventType` があればその種類だけ) */
  readonly readEventsPage: (page: {
    readonly eventType: string | null;
    readonly limit: number;
    readonly offset: number;
  }) => Promise<ReadonlyArray<EventItem>>;
  /** そのハッシュの CAS の中身 (同じ順. 無ければ `undefined`) */
  readonly readContents: (
    contentHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<ContentItem | undefined>>;
  /** CAS に無いハッシュ */
  readonly readMissingContentHashes: (
    contentHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<string>>;
  /** そのアカウントの `create_account` を受け付けたか */
  readonly readAccountCreated: (accountId: string) => Promise<boolean>;
  /**
   * 署名済みイベント (Base64) の Ed25519 署名を確かめて読む. 不正なら理由 (中身が `core.event-content` の形でないときも).
   * `content` は規則 (`core.check-event`) に渡す中身 (`contentForCheck`)
   */
  readonly verifySignedEvent: (signedEventBytes: string) => Promise<
    | {
        readonly eventHash: string;
        readonly accountId: string;
        readonly content: EventContent;
        readonly referencedContentHashes: ReadonlyArray<string>;
      }
    | { readonly invalid: string }
  >;
  /**
   * プロジェクトのコミットなら, 型検査に使うもの (`definy.commit-check-input` の値) を読む.
   * プロジェクトのコミットでなければ `null`
   */
  readonly readCommitCheckInput: (signedEventBytes: string) => Promise<unknown>;
  /** イベントを保存し, イベントハッシュを返す */
  readonly writeEvent: (signedEventBytes: string) => Promise<string>;
  /** Base64 の中身の SHA-256 (URL-safe Base64. 同じ順. Base64 でなければ `undefined`) */
  readonly hashContents: (
    contentsBytes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<string | undefined>>;
  /** 中身を CAS に保存し, 保存した content hash を返す */
  readonly writeContents: (
    items: ReadonlyArray<ContentItem>,
  ) => Promise<ReadonlyArray<string>>;
};

/** `definy.service-response` */
export type ServiceResponse = {
  readonly status: number;
  /** JSON の値 */
  readonly body: unknown;
};

/** これだけストアを読んでも終わらなければ止める */
const MAX_STEPS = 100;

/**
 * RPC のメソッド `method` を, リクエストの本文 (`request` が返す JSON の値) で, コンパイルした `definy.handle-rpc` (`service`) で処理する.
 * まだ TypeScript で処理するメソッドなら `null`
 */
export async function handleRpcInDefiny(
  service: WebAssembly.Module,
  method: string,
  request: () => unknown,
  host: ServiceIoHost,
): Promise<ServiceResponse | null> {
  const instance = instantiateCompiledFunction(service);
  const handler = instance.variant(
    instance.call({ method: instance.writeArgument(method) }),
  );
  if (handler.tag === "none") {
    return null;
  }
  if (handler.tag !== "some" || handler.payload === null) {
    throw new Error(`definy.handle-rpc returned ${handler.tag}`);
  }
  // 本文は definy が処理するメソッドのときだけ読む
  let pointer = instance.callClosure(handler.payload, [
    instance.writeArgument(jsonToDefiny(request())),
  ]);
  for (let step = 0; step < MAX_STEPS; step++) {
    const { tag, payload } = instance.variant(pointer);
    if (payload === null) {
      throw new Error(`definy.service-io の ${tag} にペイロードがありません`);
    }
    switch (tag) {
      case "respond": {
        const response = instance.read(payload) as {
          readonly status: number;
          readonly body: DefinyValue;
        };
        return { status: response.status, body: definyToJson(response.body) };
      }
      case "read_commits": {
        const commits = await host.readCommits();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(commits.map(commitSummaryLiteral)),
        ]);
        break;
      }
      case "read_events": {
        const events = await host.readEvents(
          readStrings(
            instance.read(instance.recordField(payload, "event_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            events.map((event) =>
              event === undefined
                ? variant("none")
                : variant("some", storedEventLiteral(event)),
            ),
          ),
        ]);
        break;
      }
      case "read_events_page": {
        const page = instance.read(payload) as {
          readonly event_type: DefinyValue;
          readonly limit: number;
          readonly offset: number;
        };
        const eventType = variantOf(page.event_type);
        const events = await host.readEventsPage({
          eventType:
            eventType?.tag === "some" ? String(eventType.payload) : null,
          limit: page.limit,
          offset: page.offset,
        });
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(events.map(storedEventLiteral)),
        ]);
        break;
      }
      case "read_contents": {
        const items = await host.readContents(
          readStrings(
            instance.read(instance.recordField(payload, "content_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            items.map((item) =>
              item === undefined
                ? variant("none")
                : variant("some", {
                    content_hash: item.contentHash,
                    content_bytes: item.contentBytes,
                  }),
            ),
          ),
        ]);
        break;
      }
      case "read_missing_content_hashes": {
        const missing = await host.readMissingContentHashes(
          readStrings(
            instance.read(instance.recordField(payload, "content_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(missing),
        ]);
        break;
      }
      case "verify_signed_event": {
        const result = await host.verifySignedEvent(
          String(
            instance.read(instance.recordField(payload, "signed_event_bytes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            "invalid" in result
              ? variant("invalid", result.invalid)
              : variant("valid", {
                  event_hash: result.eventHash,
                  account_id: result.accountId,
                  content: encodeEventContent(result.content),
                  referenced_content_hashes: result.referencedContentHashes,
                }),
          ),
        ]);
        break;
      }
      case "read_account_created": {
        const created = await host.readAccountCreated(
          String(instance.read(instance.recordField(payload, "account_id"))),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(created),
        ]);
        break;
      }
      case "read_commit_check_input": {
        const input = await host.readCommitCheckInput(
          String(
            instance.read(instance.recordField(payload, "signed_event_bytes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(input === null ? none() : some(input)),
        ]);
        break;
      }
      case "write_event": {
        const eventHash = await host.writeEvent(
          String(
            instance.read(instance.recordField(payload, "signed_event_bytes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(eventHash),
        ]);
        break;
      }
      case "hash_contents": {
        const hashes = await host.hashContents(
          readStrings(
            instance.read(instance.recordField(payload, "contents_bytes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            hashes.map((hash) =>
              hash === undefined ? variant("none") : variant("some", hash),
            ),
          ),
        ]);
        break;
      }
      case "write_contents": {
        const items = instance.read(
          instance.recordField(payload, "items"),
        ) as ReadonlyArray<{
          readonly content_hash: string;
          readonly content_bytes: string;
        }>;
        const stored = await host.writeContents(
          items.map((item) => ({
            contentHash: item.content_hash,
            contentBytes: item.content_bytes,
          })),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(stored),
        ]);
        break;
      }
      default:
        throw new Error(`definy.service-io ではない値です (タグ: ${tag})`);
    }
  }
  throw new Error(`${MAX_STEPS} 回ストアを読んでも終わりませんでした`);
}

function readStrings(value: DefinyValue): ReadonlyArray<string> {
  return Array.isArray(value) ? value.map(String) : [];
}

/** 保存しているイベントを definy の値 (`definy.stored-event`) にする */
function storedEventLiteral(event: EventItem): unknown {
  return {
    event_hash: event.eventHash,
    signed_event_bytes: event.signedEventBytes,
    account_id: event.accountId,
    event_type: event.eventType,
    created_at_rfc3339: event.createdAtRfc3339,
    time:
      event.timeMs === undefined
        ? variant("none")
        : variant("some", event.timeMs),
  };
}

/**
 * JSON の値を definy の値 (`definy.json`) にする.
 * definy の数は整数 (64 ビット) なので, 整数でない数は扱えない
 */
export function jsonToDefiny(value: unknown): unknown {
  if (value === null || value === undefined) {
    return variant("null");
  }
  if (typeof value === "boolean") {
    return variant("boolean", value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`definy.json cannot hold the number ${value}`);
    }
    return variant("number", value);
  }
  if (typeof value === "string") {
    return variant("string", value);
  }
  if (Array.isArray(value)) {
    return variant("array", value.map(jsonToDefiny));
  }
  if (typeof value === "object") {
    return variant(
      "object",
      Object.entries(value).map(([key, item]) => ({
        key,
        value: jsonToDefiny(item),
      })),
    );
  }
  throw new Error(`not a JSON value: ${String(value)}`);
}

/** definy の値 (`definy.json`) を JSON の値にする */
export function definyToJson(value: DefinyValue): unknown {
  const tagged = variantOf(value);
  switch (tagged?.tag) {
    case "null":
      return null;
    case "boolean":
    case "number":
    case "string":
      return tagged.payload;
    case "array":
      return (tagged.payload as ReadonlyArray<DefinyValue>).map(definyToJson);
    case "object":
      return Object.fromEntries(
        (
          tagged.payload as ReadonlyArray<{
            readonly key: string;
            readonly value: DefinyValue;
          }>
        ).map(({ key, value }) => [key, definyToJson(value)]),
      );
    default:
      throw new Error(`not a definy.json value: ${JSON.stringify(value)}`);
  }
}

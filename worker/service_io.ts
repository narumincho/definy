/**
 * サーバーの HTTP リクエストの処理を definy 製の `definy.handle-request` で動かす (docs/service.md).
 *
 * `definy.handle-request` は `npm run build:seeds` が stage1 でコンパイルした `wasm/service.wasm` を使う
 * (Cloudflare Workers は実行時に Wasm をコンパイルできない). 処理は `definy.service-io` の値を返し,
 * ストアを読む要求 (`read_commits` / `read_events`) や書き込みの要求 (`write_event` / `write_contents`) をホスト (ここ) が
 * 行って結果を `then` に渡す. イベントを受け付ける規則 (`core.check-event`) も `definy.submit-event` の中で呼ぶ. 処理は決めるだけで, できることはホストが渡す能力で決まる (wasi.io と同じ考え方. docs/wasi-io.md)
 */
import { none, some, variant, variantOf } from "../src/definy_value.ts";
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
  /** Ed25519 の署名 `signature` が公開鍵 `publicKey` で `message` の正しい署名か (`verify_ed25519`) */
  readonly verifyEd25519: (
    publicKey: Uint8Array,
    signature: Uint8Array,
    message: Uint8Array,
  ) => Promise<boolean>;
  /** 今の時刻 (Unix エポックからのミリ秒. `read_time`) */
  readonly now: () => number;
  /**
   * プロジェクトのコミットなら, 検査に使うもの (`definy.commit-check-source` の値. パーツは定義の式のまま) を読む.
   * プロジェクトのコミットでなければ `null`
   */
  readonly readCommitCheckInput: (signedEventBytes: string) => Promise<unknown>;
  /** そのパーツ (コミットの外. 各プロジェクトの `main` の最新) の定義の式 (同じ順. 無ければ `undefined`) */
  readonly readPartDefinitions: (
    partIds: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<unknown>>;
  /** definy が確かめたイベントを, definy が読んだメタデータと一緒に保存する (`write_event`) */
  readonly writeEvent: (event: {
    readonly signedEventBytes: string;
    readonly eventHash: string;
    readonly accountId: string;
    readonly eventType: string;
    readonly timeMs: number;
  }) => Promise<void>;
  /** Base64 の中身の SHA-256 (URL-safe Base64. 同じ順. Base64 でなければ `undefined`) */
  readonly hashContents: (
    contentsBytes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<string | undefined>>;
  /** 中身を CAS に保存し, 保存した content hash を返す */
  readonly writeContents: (
    items: ReadonlyArray<ContentItem>,
  ) => Promise<ReadonlyArray<string>>;
  /**
   * 処理しているリクエストの `Authorization` ヘッダーの署名を確かめる (docs/rpc-authorization.md).
   * 無ければ `anonymous`, 署名が違えば `invalid` (理由), 正しければ `account` (アカウント ID)
   */
  readonly readAuthorization: () => Promise<
    | { readonly type: "anonymous" }
    | { readonly type: "invalid"; readonly message: string }
    | { readonly type: "account"; readonly accountId: string }
  >;
  /** 環境変数 `DEFINY_ADMIN_ACCOUNT_IDS` (無ければ空文字列). 区切るのは definy */
  readonly readAdminAccountIds: () => string;
  /** ストアに seed を入れておく (入れてあれば何もしない) */
  readonly ensureSeeded: () => Promise<void>;
  /** リクエストの本文を JSON として読む (空なら `{}`). JSON のオブジェクトでなければ理由 */
  readonly readRequestJson: () => Promise<
    { readonly json: unknown } | { readonly invalid: string }
  >;
  /** キー (content hash か名前) でストアの中身を読む. 無ければ `undefined`. `contentHash` はバイト列の SHA-256 */
  readonly readRawContent: (
    key: string,
  ) => Promise<
    { readonly contentHash: string; readonly bytesBase64: string } | undefined
  >;
  /** HTTP リクエストを送る (リダイレクトはたどらない). 送れなければ理由 */
  readonly httpFetch: (request: HttpFetchRequest) => Promise<
    | {
        readonly status: number;
        readonly headers: ReadonlyArray<HttpHeader>;
        readonly bodyBase64: string;
      }
    | { readonly failed: string }
  >;
};

export type HttpHeader = { readonly name: string; readonly value: string };

/** `definy.http-fetch-request` */
export type HttpFetchRequest = {
  readonly url: string;
  readonly method: string;
  readonly headers: ReadonlyArray<HttpHeader>;
  /** 本文 (Base64). 無ければ `null` */
  readonly bodyBase64: string | null;
};

/** `definy.http-request`. 本文は `readRequestJson` で読む */
export type HttpRequestInfo = {
  readonly method: string;
  readonly path: string;
  readonly headers: ReadonlyArray<HttpHeader>;
  /** `cloudflare-d1` / `in-memory` */
  readonly storage: string;
  /** 静的アセット (`env.ASSETS`) があるか */
  readonly hasAssets: boolean;
};

/** `definy.http-body` */
export type HttpBody =
  | { readonly type: "empty" }
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "json"; readonly json: unknown }
  | { readonly type: "base64"; readonly base64: string };

/** 処理の結果. `definy.service-response` か, 静的アセットを返す (`serve_asset`) */
export type ServiceResult =
  | {
      readonly type: "respond";
      readonly status: number;
      readonly headers: ReadonlyArray<HttpHeader>;
      readonly body: HttpBody;
    }
  | { readonly type: "serve_asset" };

/** これだけストアを読んでも終わらなければ止める */
const MAX_STEPS = 100;

/**
 * HTTP リクエストを, コンパイルした `definy.handle-request` (`service`) で処理する (docs/service.md).
 * 何を返すかは definy が決め, ここは `definy.service-io` の要求をホスト (`host`) で行って `then` に渡すだけ
 */
export async function handleRequestInDefiny(
  service: WebAssembly.Module,
  request: HttpRequestInfo,
  host: ServiceIoHost,
): Promise<ServiceResult> {
  const instance = instantiateCompiledFunction(service);
  let pointer = instance.call({
    request: instance.writeArgument({
      method: request.method,
      path: request.path,
      headers: request.headers,
      storage: request.storage,
      has_assets: request.hasAssets,
    }),
  });
  for (let step = 0; step < MAX_STEPS; step++) {
    const { tag, payload } = instance.variant(pointer);
    if (tag === "serve_asset") {
      return { type: "serve_asset" };
    }
    if (payload === null) {
      throw new Error(`definy.service-io の ${tag} にペイロードがありません`);
    }
    switch (tag) {
      case "respond": {
        const response = instance.read(payload) as {
          readonly status: number;
          readonly headers: ReadonlyArray<HttpHeader>;
          readonly body: DefinyValue;
        };
        return {
          type: "respond",
          status: response.status,
          headers: response.headers,
          body: httpBody(response.body),
        };
      }
      case "ensure_seeded": {
        await host.ensureSeeded();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(true),
        ]);
        break;
      }
      case "read_request_json": {
        const body = await host.readRequestJson();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            "invalid" in body
              ? variant("invalid", body.invalid)
              : variant("json", jsonToDefiny(body.json)),
          ),
        ]);
        break;
      }
      case "read_raw_content": {
        const content = await host.readRawContent(
          String(instance.read(instance.recordField(payload, "key"))),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            content === undefined
              ? none()
              : some({
                  content_hash: content.contentHash,
                  bytes_base64: content.bytesBase64,
                }),
          ),
        ]);
        break;
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
      case "verify_ed25519": {
        const bytesField = (key: string): Uint8Array => {
          const value = instance.read(instance.recordField(payload, key));
          return Uint8Array.from(Array.isArray(value) ? value.map(Number) : []);
        };
        const valid = await host.verifyEd25519(
          bytesField("public_key"),
          bytesField("signature"),
          bytesField("message"),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(valid),
        ]);
        break;
      }
      case "read_time": {
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(host.now()),
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
      case "read_part_definitions": {
        const ids = instance.read(instance.recordField(payload, "part_ids"));
        const definitions = await host.readPartDefinitions(
          (Array.isArray(ids) ? ids : []).map(String),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            definitions.map((definition) =>
              definition === undefined ? none() : some(definition),
            ),
          ),
        ]);
        break;
      }
      case "write_event": {
        const field = (key: string): unknown =>
          instance.read(instance.recordField(payload, key));
        const eventHash = String(field("event_hash"));
        await host.writeEvent({
          signedEventBytes: String(field("signed_event_bytes")),
          eventHash,
          accountId: String(field("account_id")),
          eventType: String(field("event_type")),
          timeMs: Number(field("time_ms")),
        });
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
      case "read_authorization": {
        const authorization = await host.readAuthorization();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            authorization.type === "anonymous"
              ? variant("anonymous")
              : authorization.type === "invalid"
                ? variant("invalid", authorization.message)
                : variant("account", authorization.accountId),
          ),
        ]);
        break;
      }
      case "read_admin_account_ids": {
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(host.readAdminAccountIds()),
        ]);
        break;
      }
      case "http_fetch": {
        const request = instance.read(
          instance.recordField(payload, "request"),
        ) as {
          readonly url: string;
          readonly method: string;
          readonly headers: ReadonlyArray<HttpHeader>;
          readonly body_base64: DefinyValue;
        };
        const body = variantOf(request.body_base64);
        const result = await host.httpFetch({
          url: request.url,
          method: request.method,
          headers: request.headers,
          bodyBase64: body?.tag === "some" ? String(body.payload) : null,
        });
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            "failed" in result
              ? variant("failed", result.failed)
              : variant("response", {
                  status: result.status,
                  headers: result.headers,
                  body_base64: result.bodyBase64,
                }),
          ),
        ]);
        break;
      }
      default:
        throw new Error(`definy.service-io ではない値です (タグ: ${tag})`);
    }
  }
  throw new Error(`${MAX_STEPS} 回ストアを読んでも終わりませんでした`);
}

/** `definy.http-body` を読む */
function httpBody(value: DefinyValue): HttpBody {
  const tagged = variantOf(value);
  switch (tagged?.tag) {
    case "empty":
      return { type: "empty" };
    case "text":
      return { type: "text", text: String(tagged.payload) };
    case "json":
      return {
        type: "json",
        json: definyToJson(tagged.payload as DefinyValue),
      };
    case "base64":
      return { type: "base64", base64: String(tagged.payload) };
  }
  throw new Error(`not a definy.http-body value: ${JSON.stringify(value)}`);
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

/**
 * サーバーの HTTP リクエストの処理を definy 製の `definy.handle-request` で動かす (docs/service.md).
 *
 * `definy.handle-request` は `npm run build:seeds` が stage1 でコンパイルした `wasm/service.wasm` を使う
 * (Cloudflare Workers は実行時に Wasm をコンパイルできない). 処理は `definy.service-io` の値を返し,
 * ストアの SQL (`sql`) や読んだコミットのキャッシュ (`read_cached_commits`) などの要求をホスト (ここ) が行って結果を `then` に渡す. イベントを受け付ける規則 (`core.check-event`) も `definy.submit-event` の中で呼ぶ. 処理は決めるだけで, できることはホストが渡す能力で決まる (wasi.io と同じ考え方. docs/wasi-io.md)
 */
import { none, some, variant, variantOf } from "../src/definy_value.ts";
import {
  instantiateCompiledFunction,
  type CompiledFunctionInstance,
  type DefinyValue,
  type ValueRef,
} from "../src/stage1_compiler.ts";
import type { SeedBundle } from "./types.ts";

/** 処理がストアを読むときに使うもの */
export type ServiceIoHost = {
  /**
   * この isolate が覚えている, イベントをプロジェクトのコミットとして読んだもの (`read_cached_commits`.
   * `definy.commit-cache-entry` の値). 覚えていないイベントは入れない
   */
  readonly readCachedCommits: (
    eventHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<CommitCacheEntry>>;
  /** definy が読んだものを覚える (`write_cached_commits`) */
  readonly writeCachedCommits: (
    entries: ReadonlyArray<CommitCacheEntry>,
  ) => Promise<void>;
  /**
   * この isolate が覚えている, CAS の中身を定義の式として読んだもの (`read_cached_definitions`.
   * `definy.definition-cache-entry` の値). 覚えていない content hash は入れない
   */
  readonly readCachedDefinitions: (
    contentHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<DefinitionCacheEntry>>;
  /** definy が読んだものを覚える (`write_cached_definitions`) */
  readonly writeCachedDefinitions: (
    entries: ReadonlyArray<DefinitionCacheEntry>,
  ) => Promise<void>;
  /**
   * この isolate が覚えている, 中身を解決した結果 (`read_cached_resolutions`.
   * `definy.resolution-cache-entry` の値). 覚えていない content hash は入れない
   */
  readonly readCachedResolutions: (
    contentHashes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<ResolutionCacheEntry>>;
  /** definy が解決したものを覚える (`write_cached_resolutions`) */
  readonly writeCachedResolutions: (
    entries: ReadonlyArray<ResolutionCacheEntry>,
  ) => Promise<void>;
  /**
   * SQL の文を順に実行し, それぞれの結果の行を返す (`sql`. 2 つ以上なら 1 つのトランザクション).
   * 行は列の名前から値 (文字列, 整数, `null`) で, 列は SELECT の順
   */
  readonly runSql: (
    statements: ReadonlyArray<SqlStatement>,
  ) => Promise<ReadonlyArray<ReadonlyArray<SqlRow>>>;
  /** Ed25519 の署名 `signature` が公開鍵 `publicKey` で `message` の正しい署名か (`verify_ed25519`) */
  readonly verifyEd25519: (
    publicKey: Uint8Array,
    signature: Uint8Array,
    message: Uint8Array,
  ) => Promise<boolean>;
  /** 今の時刻 (Unix エポックからのミリ秒. `read_time`) */
  readonly now: () => number;
  /** Base64 の中身の SHA-256 (URL-safe Base64. 同じ順. Base64 でなければ `undefined`) */
  readonly hashContents: (
    contentsBytes: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<string | undefined>>;
  /** リクエストの本文 (UTF-8 の文字列. `read_request_text`). 署名を確かめるのは definy (`definy.read-rpc-authorization`) */
  readonly readRequestText: () => Promise<string>;
  /** 環境変数 `DEFINY_ADMIN_ACCOUNT_IDS` (無ければ空文字列). 区切るのは definy */
  readonly readAdminAccountIds: () => string;
  /**
   * この isolate がもうストアに seed を入れたか (`read_seed_status`) と, 期待する seed の指紋.
   * 入れていなければ, 入れ終わる (`markSeeded`) まで他のリクエストを待たせる
   */
  readonly readSeedStatus: () => Promise<{
    readonly seeded: boolean;
    readonly expectedFingerprint: string;
  }>;
  /** seed バンドル (`read_seed_bundle`. 指紋も付ける). 読めなければ `null` */
  readonly readSeedBundle: () => Promise<
    (SeedBundle & { readonly fingerprint: string }) | null
  >;
  /** この isolate がストアに seed を入れた (`mark_seeded`) */
  readonly markSeeded: () => void;
  /** リクエストの本文を JSON として読む (空なら `{}`). JSON のオブジェクトでなければ理由 */
  readonly readRequestJson: () => Promise<
    { readonly json: unknown } | { readonly invalid: string }
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
  /**
   * パフォーマンス記録の受け口 (任意. docs/performance-observability.md)。
   * リクエストの処理が終わったときに 1 回だけ呼ばれる。時間を測るのはホスト側の都合で、
   * definy の処理には影響しない。ここで例外を投げても握り潰される
   */
  readonly recordPerf?: ((record: ServiceIoPerfRecord) => void) | undefined;
};

/** service-io の要求 1 種類分の時間 (docs/performance-observability.md) */
export type ServiceIoPerfSegment = {
  /** 要求のタグ (`sql`, `read_cached_commits` など。最初の呼び出しは `entry`) */
  readonly tag: string;
  /** そのタグの要求が出た回数 */
  readonly count: number;
  /** その要求に応答してから次の要求が出るまでの wasm の実行時間 (ミリ秒) */
  readonly wasmMs: number;
  /** その要求をホストが行うのにかかった時間 (ミリ秒) */
  readonly hostMs: number;
};

/** 1 リクエスト分のパフォーマンス記録 ({@link ServiceIoHost.recordPerf} に渡す) */
export type ServiceIoPerfRecord = {
  readonly method: string;
  readonly path: string;
  /** definy が決めた HTTP ステータス。`serve_asset` のときと例外で終わったときは `null` */
  readonly status: number | null;
  /** 処理を始めた時刻 (Unix エポックからのミリ秒) */
  readonly startedAtMs: number;
  readonly totalWasmMs: number;
  readonly totalHostMs: number;
  readonly segments: ReadonlyArray<ServiceIoPerfSegment>;
};

/** `definy.commit-cache-entry` (`commit` は `option<definy.stored-commit>` の definy の値) */
export type CommitCacheEntry = {
  readonly event_hash: string;
  readonly commit: unknown;
};

/** `definy.definition-cache-entry` (`definition` は `option<core.expression>` の値) */
export type DefinitionCacheEntry = {
  readonly content_hash: string;
  readonly definition: unknown;
};

/**
 * `definy.resolution-cache-entry` (`content` は `core.part-content` の値,
 * `entry` は `definy.type-check-entry` の値。どちらも即時解決できたものだけが保存される)
 */
export type ResolutionCacheEntry = {
  readonly content_hash: string;
  readonly content: unknown;
  readonly entry: unknown;
};

/** `definy.sql-value` */
export type SqlValue = string | number | null;

/** `definy.sql-statement` */
export type SqlStatement = {
  readonly sql: string;
  readonly params: ReadonlyArray<SqlValue>;
};

/** SQL の結果の行 (列の名前から値) */
export type SqlRow = Readonly<Record<string, unknown>>;

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
  /** `cloudflare-d1` (D1 の binding が無ければ `none`. ストアを使う処理は失敗する) */
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
const MAX_STEPS = 1000;

/**
 * パフォーマンス記録の集計 (docs/performance-observability.md)。
 * service-io の要求のタグごとに、wasm の実行時間 (`then` を呼ぶ時間) と
 * ホストが要求を行うのにかかった時間をはかる。調査のための測定で、処理の結果には影響しない
 */
class ServiceIoPerfCollector {
  readonly #sink: (record: ServiceIoPerfRecord) => void;
  readonly #method: string;
  readonly #path: string;
  readonly #startedAtMs: number;
  readonly #segments = new Map<
    string,
    { tag: string; count: number; wasmMs: number; hostMs: number }
  >();
  /** 今サービスしている要求のタグ。最初の呼び出しは `entry` */
  #currentTag = "entry";
  #finished = false;

  constructor(
    sink: (record: ServiceIoPerfRecord) => void,
    method: string,
    path: string,
  ) {
    this.#sink = sink;
    this.#method = method;
    this.#path = path;
    this.#startedAtMs = Date.now();
    this.#segment("entry").count = 1;
  }

  #segment(tag: string): {
    tag: string;
    count: number;
    wasmMs: number;
    hostMs: number;
  } {
    let segment = this.#segments.get(tag);
    if (segment === undefined) {
      segment = { tag, count: 0, wasmMs: 0, hostMs: 0 };
      this.#segments.set(tag, segment);
    }
    return segment;
  }

  /** 要求 `tag` のサービスを始める */
  beginRequest(tag: string): void {
    this.#currentTag = tag;
    this.#segment(tag).count += 1;
  }

  addWasm(ms: number): void {
    this.#segment(this.#currentTag).wasmMs += ms;
  }

  addHost(ms: number): void {
    this.#segment(this.#currentTag).hostMs += ms;
  }

  /** 記録を 1 回だけ受け口に渡す。受け口の例外は握り潰す */
  finish(status: number | null): void {
    if (this.#finished) {
      return;
    }
    this.#finished = true;
    const segments = [...this.#segments.values()].map((segment) => ({
      ...segment,
    }));
    try {
      this.#sink({
        method: this.#method,
        path: this.#path,
        status,
        startedAtMs: this.#startedAtMs,
        totalWasmMs: segments.reduce((sum, segment) => sum + segment.wasmMs, 0),
        totalHostMs: segments.reduce((sum, segment) => sum + segment.hostMs, 0),
        segments,
      });
    } catch {
      // 記録の失敗でリクエストを壊さない
    }
  }
}

/** `callClosure` の時間を {@link ServiceIoPerfCollector} に集めるインスタンス */
function timedInstance(
  instance: CompiledFunctionInstance,
  perf: ServiceIoPerfCollector,
): CompiledFunctionInstance {
  return {
    ...instance,
    callClosure: (closure, argumentValues) => {
      const start = performance.now();
      try {
        return instance.callClosure(closure, argumentValues);
      } finally {
        perf.addWasm(performance.now() - start);
      }
    },
  };
}

/** ホストの能力にかかる時間を {@link ServiceIoPerfCollector} に集めるホスト */
function timedHost(
  host: ServiceIoHost,
  perf: ServiceIoPerfCollector,
): ServiceIoHost {
  return new Proxy(host, {
    get(target, name) {
      const value = Reflect.get(target, name) as unknown;
      if (typeof value !== "function") {
        return value;
      }
      return (...args: Array<unknown>) => {
        const start = performance.now();
        const done = (): void => {
          perf.addHost(performance.now() - start);
        };
        try {
          const result = (value as (...a: Array<unknown>) => unknown).apply(
            target,
            args,
          );
          if (result instanceof Promise) {
            return result.then(
              (resolved) => {
                done();
                return resolved;
              },
              (error: unknown) => {
                done();
                throw error;
              },
            );
          }
          done();
          return result;
        } catch (error) {
          done();
          throw error;
        }
      };
    },
  });
}

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
  const perf =
    host.recordPerf === undefined
      ? undefined
      : new ServiceIoPerfCollector(
          host.recordPerf,
          request.method,
          request.path,
        );
  const start = performance.now();
  let first: ValueRef;
  try {
    first = instance.call({
      request: instance.writeArgument({
        method: request.method,
        path: request.path,
        headers: request.headers,
        storage: request.storage,
        has_assets: request.hasAssets,
      }),
    });
  } catch (error) {
    perf?.finish(null);
    throw error;
  }
  // 最初の呼び出し (entry) の wasm 時間
  perf?.addWasm(performance.now() - start);
  return runServiceIo(instance, first, host, perf);
}

/** ストアの seed を入れる能力 (`definy.ensure-seeded`) */
export type SeedHost = Pick<
  ServiceIoHost,
  "runSql" | "readSeedStatus" | "readSeedBundle" | "markSeeded"
>;

/**
 * コンパイルした `definy.seed-store` (`seeder`. wasm/seeder.wasm) でストアに seed を入れる (docs/database.md).
 * 渡すのは seed に使う能力だけ (他の要求は例外)
 */
export async function seedStoreInDefiny(
  seeder: WebAssembly.Module,
  host: SeedHost,
): Promise<void> {
  const instance = instantiateCompiledFunction(seeder);
  await runServiceIo(
    instance,
    instance.call({ status: instance.writeArgument(204) }),
    new Proxy(host as ServiceIoHost, {
      get: (target, name) =>
        name in target
          ? target[name as keyof ServiceIoHost]
          : () => {
              throw new Error(`the seed host has no ${String(name)}`);
            },
    }),
  );
}

/** `definy.service-io` の要求をホストで行って `then` に渡し, 結果が出るまで続ける */
async function runServiceIo(
  rawInstance: CompiledFunctionInstance,
  start: ValueRef,
  rawHost: ServiceIoHost,
  perf?: ServiceIoPerfCollector,
): Promise<ServiceResult> {
  const instance =
    perf === undefined ? rawInstance : timedInstance(rawInstance, perf);
  const host = perf === undefined ? rawHost : timedHost(rawHost, perf);
  try {
    return await runServiceIoLoop(instance, start, host, perf);
  } catch (error) {
    // 例外で終わったリクエストも記録する (ステータスは無い)
    perf?.finish(null);
    throw error;
  }
}

async function runServiceIoLoop(
  instance: CompiledFunctionInstance,
  start: ValueRef,
  host: ServiceIoHost,
  perf?: ServiceIoPerfCollector,
): Promise<ServiceResult> {
  let pointer = start;
  for (let step = 0; step < MAX_STEPS; step++) {
    const { tag, payload } = instance.variant(pointer);
    if (tag === "serve_asset") {
      perf?.finish(null);
      return { type: "serve_asset" };
    }
    perf?.beginRequest(tag);
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
        const result: ServiceResult = {
          type: "respond",
          status: response.status,
          headers: response.headers,
          body: httpBody(response.body),
        };
        perf?.finish(response.status);
        return result;
      }
      case "read_seed_status": {
        const status = await host.readSeedStatus();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument({
            seeded: status.seeded,
            expected_fingerprint: status.expectedFingerprint,
          }),
        ]);
        break;
      }
      case "read_seed_bundle": {
        const bundle = await host.readSeedBundle();
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            bundle === null
              ? none()
              : some({
                  fingerprint: bundle.fingerprint,
                  events: bundle.events.map((event) => ({
                    event_hash: event.eventHash,
                    signed_event_bytes: event.signedEventBytes,
                    account_id: event.accountId,
                    event_type: event.eventType,
                    created_at_rfc3339: event.createdAtRfc3339,
                    time_ms: event.timeMs,
                  })),
                  contents: bundle.contents.map((item) => ({
                    content_hash: item.contentHash,
                    content_bytes: item.contentBytes,
                  })),
                }),
          ),
        ]);
        break;
      }
      case "mark_seeded": {
        host.markSeeded();
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
      case "sql": {
        const statements = instance.read(
          instance.recordField(payload, "statements"),
        ) as ReadonlyArray<{
          readonly sql: string;
          readonly params: ReadonlyArray<DefinyValue>;
        }>;
        const results = await host.runSql(
          statements.map((statement) => ({
            sql: statement.sql,
            params: statement.params.map(sqlValueFromDefiny),
          })),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(
            results.map((rows) => rows.map(sqlRowLiteral)),
          ),
        ]);
        break;
      }
      case "read_cached_commits": {
        const entries = await host.readCachedCommits(
          readStrings(
            instance.read(instance.recordField(payload, "event_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(entries),
        ]);
        break;
      }
      case "write_cached_commits": {
        await host.writeCachedCommits(
          instance.read(
            instance.recordField(payload, "entries"),
          ) as ReadonlyArray<CommitCacheEntry>,
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(true),
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
      case "read_cached_definitions": {
        const entries = await host.readCachedDefinitions(
          readStrings(
            instance.read(instance.recordField(payload, "content_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(entries),
        ]);
        break;
      }
      case "write_cached_definitions": {
        await host.writeCachedDefinitions(
          instance.read(
            instance.recordField(payload, "entries"),
          ) as ReadonlyArray<DefinitionCacheEntry>,
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(true),
        ]);
        break;
      }
      case "read_cached_resolutions": {
        const entries = await host.readCachedResolutions(
          readStrings(
            instance.read(instance.recordField(payload, "content_hashes")),
          ),
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(entries),
        ]);
        break;
      }
      case "write_cached_resolutions": {
        await host.writeCachedResolutions(
          instance.read(
            instance.recordField(payload, "entries"),
          ) as ReadonlyArray<ResolutionCacheEntry>,
        );
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(true),
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
      case "read_request_text": {
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(await host.readRequestText()),
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

/** `definy.sql-value` を SQL のパラメーターにする */
function sqlValueFromDefiny(value: DefinyValue): SqlValue {
  const tagged = variantOf(value);
  switch (tagged?.tag) {
    case "null":
      return null;
    case "integer":
      return Number(tagged.payload);
    case "text":
      return String(tagged.payload);
  }
  throw new Error(`not a definy.sql-value value: ${JSON.stringify(value)}`);
}

/** SQL の結果の行を definy の値 (`definy.sql-row`) にする. 整数でない数と BLOB は文字列にする */
function sqlRowLiteral(row: SqlRow): unknown {
  return Object.entries(row).map(([name, value]) => ({
    name,
    value:
      value === null || value === undefined
        ? variant("null")
        : typeof value === "number" && Number.isSafeInteger(value)
          ? variant("integer", value)
          : typeof value === "bigint"
            ? variant("integer", Number(value))
            : variant("text", String(value)),
  }));
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

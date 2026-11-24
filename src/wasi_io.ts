/**
 * `wasi.io` (= `definy.io(A: String)`) の値を返す式 (I/O をするプログラム) を, ホスト (ブラウザ / Node.js) の上で動かす.
 * プログラムは純粋なままで, I/O の要求 (`outgoing_request` / `get_parts`) を値として返し,
 * ホストがその I/O をして結果を `then` の関数に渡す. `done(message)` を返したら終わり.
 *
 * - `outgoing_request` は wasi:http/outgoing-handler の `handle` に相当し, ホストの `fetch` で送る
 * - `get_parts` は実行している definy からパーツの最新の式を読む (quote したコード `core.code` をコンパイルするため)
 * - API トークンなどのシークレットはプログラムに渡さず, リクエストの `secret_headers` にある
 *   シークレット (`Secret` 型の値 `{ id, label }`) の値をホストが送信の直前に入れる (docs/secret.md)
 *
 * 詳細は docs/wasi-io.md
 */
import { variant, variantOf } from "./definy_value.ts";
import { IoUnsupported, runIo } from "./io_runner.ts";
import {
  containsHole,
  instantiateCompiledValue,
  stage1PartsValue,
  type DefinyValue,
  type Stage1ReferencedPart,
} from "./stage1_compiler.ts";

export type WasiHttpHeader = {
  readonly name: string;
  readonly value: string;
};

/** `wasi.outgoing-request` (`secret_headers` はホストが値を入れて `headers` に足したあとのもの) */
export type WasiOutgoingRequest = {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyArray<WasiHttpHeader>;
  readonly body: Uint8Array;
};

/** `Secret` 型の値. 実際の値は持たない */
export type WasiSecretReference = {
  readonly id: string;
  readonly label: string;
};

/** 利用者が入れたシークレットの値と, 送ってよい URL の先頭 */
export type WasiSecretValue = {
  readonly value: string;
  readonly allowedUrlPrefixes: ReadonlyArray<string>;
};

/** シークレットを使った (使おうとした) 記録 */
export type WasiSecretUse = {
  readonly secret: WasiSecretReference;
  readonly url: string;
  /** 値を入れて送ったか. 値が無い・宛先が許可されていないときは false */
  readonly sent: boolean;
};

/** `wasi.incoming-response` */
export type WasiIncomingResponse = {
  readonly status: number;
  readonly headers: ReadonlyArray<WasiHttpHeader>;
  readonly body: Uint8Array;
};

/** `wasi.http-result` */
export type WasiHttpResult =
  { readonly ok: WasiIncomingResponse } | { readonly error: string };

export type WasiIoHost = {
  /**
   * HTTP リクエストを送る. 失敗 (ネットワークエラー, CORS エラーなど) は `{ error }` で返す.
   * `signal` は `race` で負けたなど, 結果が要らなくなったときに中断される (GET / HEAD は止めてよい)
   */
  readonly handle: (
    request: WasiOutgoingRequest,
    signal?: AbortSignal,
  ) => Promise<WasiHttpResult>;
  /**
   * `get_parts` で, パーツ ID (URL-safe Base64) からパーツの最新の式 (definy の JSON AST) を返す.
   * 見つからない・式を持たないパーツは `undefined`
   */
  readonly getPart: (id: string) => unknown;
  /** シークレットの値. 利用者が入れていなければ `undefined` */
  readonly getSecret: (id: string) => WasiSecretValue | undefined;
  /** シークレットを使った (使おうとした) ときに呼ぶ (使用履歴のため) */
  readonly onSecretUse?: (use: WasiSecretUse) => void;
  /** I/O をするたびに呼ぶ (画面に経過を出すため) */
  readonly onStep?: (step: WasiIoStep) => void;
};

/** プログラムがした I/O の記録. シークレットは名前だけで値は記録しない */
export type WasiIoStep =
  | {
      readonly kind: "outgoing_request";
      readonly method: string;
      readonly url: string;
      readonly bodyBytes: number;
      /** 値を入れたシークレットの名前 */
      readonly secrets: ReadonlyArray<string>;
      readonly result: { readonly status: number } | { readonly error: string };
    }
  | {
      readonly kind: "get_parts";
      readonly found: number;
      readonly missing: ReadonlyArray<string>;
    };

/** I/O の記録 1 つを 1 行にする */
export function formatWasiIoStep(step: WasiIoStep): string {
  switch (step.kind) {
    case "get_parts":
      return `get_parts: ${step.found} 個${step.missing.length > 0 ? ` (見つからない: ${step.missing.join(", ")})` : ""}`;
    case "outgoing_request":
      return `${step.method} ${step.url} (${step.bodyBytes} bytes${step.secrets.length > 0 ? `, シークレット: ${step.secrets.join(", ")}` : ""}) → ${"error" in step.result ? `エラー: ${step.result.error}` : step.result.status}`;
  }
}

/** これだけ I/O をしても終わらなければ止める */
const MAX_STEPS = 1000;

/** `wasi.io` (`definy.io`) の値か (タグが `done` か, 実行パネルで動かせる I/O の Variant か) */
export function isWasiIoValue(value: DefinyValue): boolean {
  const tag = variantOf(value)?.tag;
  return tag !== undefined && WASI_IO_TAGS.has(tag);
}

const WASI_IO_TAGS: ReadonlySet<string> = new Set([
  "done",
  "all",
  "race",
  "sleep",
  "outgoing_request",
  "get_parts",
]);

/** `wasi.http-result` の値 */
function httpResultLiteral(result: WasiHttpResult): unknown {
  if ("error" in result) {
    return variant("error", result.error);
  }
  const { status, headers, body } = result.ok;
  return variant("ok", {
    status,
    headers: headers.map((header) => ({
      name: header.name,
      value: header.value,
    })),
    body: Array.from(body),
    text: new TextDecoder().decode(body),
  });
}

type SecretHeader = {
  readonly name: string;
  readonly prefix: string;
  readonly secret: WasiSecretReference;
};

function readOutgoingRequest(value: DefinyValue): {
  readonly request: WasiOutgoingRequest;
  readonly secretHeaders: ReadonlyArray<SecretHeader>;
} {
  const record = value as {
    readonly method?: unknown;
    readonly url?: unknown;
    readonly headers?: unknown;
    readonly secret_headers?: unknown;
    readonly body?: unknown;
  };
  const headers = Array.isArray(record.headers)
    ? (record.headers as ReadonlyArray<{
        readonly name?: unknown;
        readonly value?: unknown;
      }>)
    : [];
  const secretHeaders = Array.isArray(record.secret_headers)
    ? (record.secret_headers as ReadonlyArray<{
        readonly name?: unknown;
        readonly prefix?: unknown;
        readonly secret?: { readonly id?: unknown; readonly label?: unknown };
      }>)
    : [];
  return {
    request: {
      method: String(record.method ?? "GET"),
      url: String(record.url ?? ""),
      headers: headers.map((header) => ({
        name: String(header.name ?? ""),
        value: String(header.value ?? ""),
      })),
      body: Uint8Array.from(
        Array.isArray(record.body)
          ? (record.body as ReadonlyArray<number>)
          : [],
        (byte) => Number(byte) & 0xff,
      ),
    },
    secretHeaders: secretHeaders.map((header) => ({
      name: String(header.name ?? ""),
      prefix: String(header.prefix ?? ""),
      secret: {
        id: String(header.secret?.id ?? ""),
        label: String(header.secret?.label ?? ""),
      },
    })),
  };
}

/**
 * `secret_headers` のシークレットの値を入れたヘッダーを足す.
 * 値が無い・宛先が許可されていないシークレットがあれば, 送らずにその理由を返す
 */
function withSecretHeaders(
  request: WasiOutgoingRequest,
  secretHeaders: ReadonlyArray<SecretHeader>,
  host: WasiIoHost,
): { readonly request: WasiOutgoingRequest } | { readonly error: string } {
  const headers: WasiHttpHeader[] = [...request.headers];
  for (const { name, prefix, secret } of secretHeaders) {
    const stored = host.getSecret(secret.id);
    if (stored === undefined) {
      host.onSecretUse?.({ secret, url: request.url, sent: false });
      return {
        error: `シークレット「${secret.label}」の値が入っていません. そのシークレットのパーツのページで値を入れてください`,
      };
    }
    if (
      !stored.allowedUrlPrefixes.some(
        (allowed) => allowed !== "" && request.url.startsWith(allowed),
      )
    ) {
      host.onSecretUse?.({ secret, url: request.url, sent: false });
      return {
        error: `シークレット「${secret.label}」は ${request.url} に送れません (送ってよい宛先: ${stored.allowedUrlPrefixes.join(", ") || "なし"})`,
      };
    }
    headers.push({ name, value: prefix + stored.value });
  }
  for (const { secret } of secretHeaders) {
    host.onSecretUse?.({ secret, url: request.url, sent: true });
  }
  return { request: { ...request, headers } };
}

/**
 * stage1 でコンパイルできる式か (未入力のある式は渡さない).
 * 型パーツの宣言式は渡す. 型引数 (`T: @definy.sql-statement` など) で参照されると, 渡さなければ `unreachable` になる
 * (`collectReferencedParts` と同じ. 実行時は参照のままの値になる)
 */
function isCompilable(expression: unknown): boolean {
  return !containsHole(expression);
}

/**
 * `wasi.io` の値を返す式をコンパイルした Wasm を動かし, `done` のメッセージを返す.
 * `all` / `race` / `sleep` は `runIo` (src/io_runner.ts) が受け持つ.
 * プログラムがこのホストでできない I/O を頼んだら例外を投げる
 */
export async function runWasiIo(
  module: WebAssembly.Module,
  host: WasiIoHost,
): Promise<string> {
  const instance = instantiateCompiledValue(module);
  const done = await runIo(instance, instance.root, {
    maxSteps: MAX_STEPS,
    leaf: async (tag, payload, signal) => {
      switch (tag) {
        case "outgoing_request": {
          const { request, secretHeaders } = readOutgoingRequest(
            instance.read(instance.recordField(payload, "request")),
          );
          const prepared = withSecretHeaders(request, secretHeaders, host);
          const result: WasiHttpResult =
            "error" in prepared
              ? { error: prepared.error }
              : await host.handle(prepared.request, signal);
          host.onStep?.({
            kind: "outgoing_request",
            method: request.method,
            url: request.url,
            bodyBytes: request.body.byteLength,
            secrets: secretHeaders.map((header) => header.secret.label),
            result:
              "error" in result
                ? { error: result.error }
                : { status: result.ok.status },
          });
          return instance.writeArgument(httpResultLiteral(result));
        }
        case "get_parts": {
          const ids = instance.read(instance.recordField(payload, "ids"));
          const parts: Stage1ReferencedPart[] = [];
          const missing: string[] = [];
          for (const id of Array.isArray(ids) ? ids : []) {
            const expression = host.getPart(String(id));
            if (expression == null || !isCompilable(expression)) {
              missing.push(String(id));
            } else {
              parts.push({ id: String(id), expression });
            }
          }
          host.onStep?.({ kind: "get_parts", found: parts.length, missing });
          return instance.writeArgument(stage1PartsValue(parts));
        }
        default:
          throw new IoUnsupported(tag);
      }
    },
  });
  return String(instance.read(done));
}

/**
 * `fetch` で HTTP リクエストを送る `WasiIoHost["handle"]`.
 * 送れなかったとき (ブラウザでは CORS で読めないときも `TypeError` になる) は `{ error }` を返す
 */
export function fetchHandler(
  fetchFn: typeof fetch = fetch,
): WasiIoHost["handle"] {
  return async (request, signal) => {
    try {
      const response = await fetchFn(request.url, {
        method: request.method,
        // 読むだけのリクエストは結果が要らなくなったら止める. 書き込みは最後まで送る
        signal:
          request.method === "GET" || request.method === "HEAD"
            ? (signal ?? null)
            : null,
        headers: request.headers.map((header): [string, string] => [
          header.name,
          header.value,
        ]),
        body:
          request.method === "GET" || request.method === "HEAD"
            ? null
            : (request.body as unknown as BodyInit),
      });
      const headers: WasiHttpHeader[] = [];
      response.headers.forEach((value, name) => {
        headers.push({ name, value });
      });
      return {
        ok: {
          status: response.status,
          headers,
          body: new Uint8Array(await response.arrayBuffer()),
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  };
}

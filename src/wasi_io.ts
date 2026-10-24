/**
 * `wasi.io` の値を返す式 (I/O をするプログラム) を, ホスト (ブラウザ / Node.js) の上で 1 歩ずつ動かす.
 * プログラムは純粋なままで, I/O の要求 (`outgoing_request` / `get_environment`) を値として返し,
 * ホストがその I/O をして結果を `then` の関数に渡す. `done(message)` を返したら終わり.
 *
 * - `outgoing_request` は wasi:http/outgoing-handler の `handle` に相当し, ホストの `fetch` で送る
 * - `get_parts` は実行している definy からパーツの最新の式を読む (quote したコード `core.code` をコンパイルするため)
 * - `get_environment` は wasi:cli/environment の `get-environment` に相当する
 *
 * 詳細は docs/wasi-io.md
 */
import {
  selfHostedList,
  selfHostedNumber,
  selfHostedRecord,
  selfHostedString,
  selfHostedVariant,
} from "./self_hosted_ast.ts";
import {
  definyAstToSelfHostedAst,
  instantiateCompiledValue,
  SelfHostedAstConversionError,
  stage1PartsExpression,
  type DefinyValue,
  type Stage1ReferencedPart,
} from "./stage1_compiler.ts";

export type WasiHttpHeader = {
  readonly name: string;
  readonly value: string;
};

/** `wasi.outgoing-request` */
export type WasiOutgoingRequest = {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyArray<WasiHttpHeader>;
  readonly body: Uint8Array;
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
  /** HTTP リクエストを送る. 失敗 (ネットワークエラー, CORS エラーなど) は `{ error }` で返す */
  readonly handle: (request: WasiOutgoingRequest) => Promise<WasiHttpResult>;
  /**
   * `get_parts` で, パーツ ID (URL-safe Base64) からパーツの最新の式 (definy の JSON AST) を返す.
   * 見つからない・式を持たないパーツは `undefined`
   */
  readonly getPart: (id: string) => unknown;
  /** `get_environment` で渡す環境変数 */
  readonly environment: ReadonlyArray<WasiHttpHeader>;
  /** I/O をするたびに呼ぶ (画面に経過を出すため) */
  readonly onStep?: (step: WasiIoStep) => void;
};

/** プログラムがした I/O の記録. 環境変数の値は記録しない (トークンなどが入るため) */
export type WasiIoStep =
  | {
      readonly kind: "outgoing_request";
      readonly method: string;
      readonly url: string;
      readonly bodyBytes: number;
      readonly result: { readonly status: number } | { readonly error: string };
    }
  | {
      readonly kind: "get_parts";
      readonly found: number;
      readonly missing: ReadonlyArray<string>;
    }
  | { readonly kind: "get_environment"; readonly names: ReadonlyArray<string> };

/** これだけ I/O をしても終わらなければ止める */
const MAX_STEPS = 1000;

/** `wasi.io` の値か (タグが `done` / `outgoing_request` / `get_environment` の Variant か) */
export function isWasiIoValue(value: DefinyValue): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "tag" in value &&
    "payload" in value &&
    (value.tag === "done" ||
      value.tag === "outgoing_request" ||
      value.tag === "get_parts" ||
      value.tag === "get_environment")
  );
}

function headersLiteral(headers: ReadonlyArray<WasiHttpHeader>): unknown {
  return selfHostedList(
    headers.map((header) =>
      selfHostedRecord([
        ["name", selfHostedString(header.name)],
        ["value", selfHostedString(header.value)],
      ]),
    ),
  );
}

function bytesLiteral(bytes: Uint8Array): unknown {
  return selfHostedList(Array.from(bytes, (byte) => selfHostedNumber(byte)));
}

/** `wasi.http-result` の値を作るリテラル */
export function httpResultLiteral(result: WasiHttpResult): unknown {
  if ("error" in result) {
    return selfHostedVariant("error", selfHostedString(result.error));
  }
  const { status, headers, body } = result.ok;
  return selfHostedVariant(
    "ok",
    selfHostedRecord([
      ["status", selfHostedNumber(status)],
      ["headers", headersLiteral(headers)],
      ["body", bytesLiteral(body)],
      ["text", selfHostedString(new TextDecoder().decode(body))],
    ]),
  );
}

function readOutgoingRequest(value: DefinyValue): WasiOutgoingRequest {
  const record = value as {
    readonly method?: unknown;
    readonly url?: unknown;
    readonly headers?: unknown;
    readonly body?: unknown;
  };
  const headers = Array.isArray(record.headers)
    ? (record.headers as ReadonlyArray<{
        readonly name?: unknown;
        readonly value?: unknown;
      }>)
    : [];
  return {
    method: String(record.method ?? "GET"),
    url: String(record.url ?? ""),
    headers: headers.map((header) => ({
      name: String(header.name ?? ""),
      value: String(header.value ?? ""),
    })),
    body: Uint8Array.from(
      Array.isArray(record.body) ? (record.body as ReadonlyArray<number>) : [],
      (byte) => Number(byte) & 0xff,
    ),
  };
}

/** `core.expression` で表せる式か (型パーツの式などは表せないので渡さない) */
function isCompilable(expression: unknown): boolean {
  try {
    definyAstToSelfHostedAst(expression);
    return true;
  } catch (e) {
    if (e instanceof SelfHostedAstConversionError) {
      return false;
    }
    throw e;
  }
}

/**
 * `wasi.io` の値を返す式をコンパイルした Wasm を動かし, `done` のメッセージを返す.
 * プログラムが `wasi.io` 以外の値を返したら例外を投げる
 */
export async function runWasiIo(
  module: WebAssembly.Module,
  host: WasiIoHost,
): Promise<string> {
  const instance = instantiateCompiledValue(module);
  let pointer = instance.root;
  for (let step = 0; step < MAX_STEPS; step++) {
    const { tag, payload } = instance.variant(pointer);
    if (payload === null) {
      throw new Error(`wasi.io の ${tag} にペイロードがありません`);
    }
    switch (tag) {
      case "done": {
        return String(instance.read(payload));
      }
      case "outgoing_request": {
        const request = readOutgoingRequest(
          instance.read(instance.recordField(payload, "request")),
        );
        const result = await host.handle(request);
        host.onStep?.({
          kind: "outgoing_request",
          method: request.method,
          url: request.url,
          bodyBytes: request.body.byteLength,
          result:
            "error" in result
              ? { error: result.error }
              : { status: result.ok.status },
        });
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(httpResultLiteral(result)),
        ]);
        break;
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
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(stage1PartsExpression(parts)),
        ]);
        break;
      }
      case "get_environment": {
        host.onStep?.({
          kind: "get_environment",
          names: host.environment.map((entry) => entry.name),
        });
        pointer = instance.callClosure(instance.recordField(payload, "then"), [
          instance.writeArgument(headersLiteral(host.environment)),
        ]);
        break;
      }
      default:
        throw new Error(`wasi.io ではない値です (タグ: ${tag})`);
    }
  }
  throw new Error(`${MAX_STEPS} 回 I/O をしても終わりませんでした`);
}

/**
 * `fetch` で HTTP リクエストを送る `WasiIoHost["handle"]`.
 * 送れなかったとき (ブラウザでは CORS で読めないときも `TypeError` になる) は `{ error }` を返す
 */
export function fetchHandler(
  fetchFn: typeof fetch = fetch,
): WasiIoHost["handle"] {
  return async (request) => {
    try {
      const response = await fetchFn(request.url, {
        method: request.method,
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

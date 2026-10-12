import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  callDefinyFunction,
  decodeCborItem,
  type DefinyValue,
  deriveModuleIdBytes,
  deriveModulePartId,
  evaluateCborExpression,
  executeWasmBinary,
  toUint8Array,
} from "./cbor_eval.ts";
import type { Env } from "./types.ts";

export interface PartStoreReader {
  getEvents(
    req: { readonly eventType?: string; readonly limit?: number },
    env?: Env,
  ): Promise<
    ReadonlyArray<{
      readonly eventHash: string;
      readonly signedEventBytes: string;
    }>
  >;
  getRawContentBytes(hash: string, env?: Env): Promise<Uint8Array | undefined>;
}

/**
 * バイト列 (`Uint8Array`) から純粋関数型 Pull 型ストリーム (`ByteStream = { initialState, next }`) を構築する。
 * `next(state)` は `yield({ chunk: List<Number>, nextState: State }) | done` の直和型バリアントを返す。
 */
export function createByteStreamDefinyValue(bytes: Uint8Array): DefinyValue {
  const chunkNumbers: ReadonlyArray<number> = Array.from(bytes);
  return {
    initialState: 0,
    next: {
      __nativeFn: (state: DefinyValue): DefinyValue => {
        const idx = typeof state === "number" ? state : 0;
        if (idx === 0 && chunkNumbers.length > 0) {
          return {
            __variant: "yield",
            payload: {
              chunk: chunkNumbers,
              nextState: 1,
            },
          };
        }
        return {
          __variant: "done",
          payload: null,
        };
      },
    },
  };
}

/**
 * 指定された `partId`（PartHashId / `module.part` / `partName` / `contentHash`）を
 * D1 またはインメモリストアから解決し、純粋な HTTP リクエスト `{ method, url, headers, body }` に対して評価する。
 * ホスト側での URL パス・クエリの事前分割は行わず、利用者側の純粋関数 (`std.url-path` / `std.url-query`) に委ねる。
 */
export async function evaluatePartForHttpRequest(
  partId: string,
  request: Request,
  store: PartStoreReader,
  env?: Env,
  overrideUrl?: string,
): Promise<DefinyValue | undefined> {
  const trimmed = partId.trim();
  if (!trimmed) {
    return undefined;
  }

  // 1. 直接 CAS に Wasm または式 CBOR として存在するかチェック
  const directBytes = await store.getRawContentBytes(trimmed, env);
  if (directBytes && directBytes.length >= 4) {
    if (
      directBytes[0] === 0x00 &&
      directBytes[1] === 0x61 &&
      directBytes[2] === 0x73 &&
      directBytes[3] === 0x6d
    ) {
      return await executeWasmBinary(directBytes);
    }
  }

  // 2. 全 ModuleCommit イベントからパーツ辞書を構築
  const commitEvents = await store.getEvents(
    { eventType: "module_commit", limit: 500 },
    env,
  );
  const partMap = new Map<string, unknown>();

  const loadPartExpression = async (
    partObj: Record<string, unknown>,
  ): Promise<unknown | undefined> => {
    if (partObj.expression != null) {
      return partObj.expression;
    }
    if (partObj.content_hash != null) {
      const hashBytes = toUint8Array(partObj.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : String(partObj.content_hash);
      const casBytes = await store.getRawContentBytes(contentHash, env);
      if (casBytes) {
        const [decoded] = decodeCborItem(casBytes);
        return decoded;
      }
    }
    return undefined;
  };

  let targetExpr: unknown | undefined;

  if (directBytes) {
    try {
      const [decoded] = decodeCborItem(directBytes);
      targetExpr = decoded;
    } catch {
      // CBOR ではない場合は無視
    }
  }

  for (const ev of commitEvents) {
    try {
      const evBytes = base64ToBytes(ev.signedEventBytes);
      const [signedRaw] = decodeCborItem(evBytes);
      if (!signedRaw || typeof signedRaw !== "object") continue;
      const signedObj = signedRaw as Record<string, unknown>;
      const eventBinaryField = signedObj.event_binary as
        | { value?: unknown }
        | undefined;
      const innerBytes = toUint8Array(
        eventBinaryField?.value ?? eventBinaryField,
      );
      if (!innerBytes) continue;
      const [innerRaw] = decodeCborItem(innerBytes);
      if (!innerRaw || typeof innerRaw !== "object") continue;
      const innerObj = innerRaw as Record<string, unknown>;
      const accountBytes = toUint8Array(innerObj.account_id);
      const contentObj = innerObj.content as
        | Record<string, unknown>
        | undefined;
      if (!accountBytes || !contentObj || !("ModuleCommit" in contentObj)) {
        continue;
      }
      const mc = contentObj.ModuleCommit as {
        module_name?: string;
        parts?: ReadonlyArray<Record<string, unknown>>;
      };
      const moduleName = String(mc.module_name ?? "");
      const moduleIdBytes = await deriveModuleIdBytes(accountBytes, moduleName);

      for (const part of mc.parts ?? []) {
        if (!part || typeof part !== "object") continue;
        const partName = String(part.name ?? "");
        const derivedId = await deriveModulePartId(moduleIdBytes, partName);

        if (!partMap.has(derivedId)) {
          const expr = await loadPartExpression(part);
          if (expr !== undefined) {
            partMap.set(derivedId, expr);
          }
        }

        if (
          targetExpr === undefined &&
          (derivedId === trimmed ||
            partName === trimmed ||
            `${moduleName}.${partName}` === trimmed)
        ) {
          targetExpr = partMap.get(derivedId) ??
            (await loadPartExpression(part));
        }
      }
    } catch {
      continue;
    }
  }

  if (targetExpr === undefined) {
    return undefined;
  }

  const resolvePartExpr = (partHash: string): Promise<unknown | undefined> =>
    Promise.resolve(partMap.get(partHash));

  const evaluated = await evaluateCborExpression(
    targetExpr,
    new Map(),
    resolvePartExpr,
  );

  // トップレベルが関数の場合、純粋な HTTP リクエストレコード { method, url, headers, body } を第1引数に渡して呼び出す
  if (
    evaluated &&
    typeof evaluated === "object" &&
    ("__fn" in evaluated || "__nativeFn" in evaluated)
  ) {
    const reqHeaders: Array<DefinyValue> = [];
    request.headers.forEach((value, name) => {
      reqHeaders.push({ name, value });
    });
    const reqBodyBytes =
      request.body && request.method !== "GET" && request.method !== "HEAD"
        ? new Uint8Array(await request.clone().arrayBuffer())
        : new Uint8Array(0);
    const reqValue: DefinyValue = {
      method: request.method,
      url: overrideUrl ?? request.url,
      headers: reqHeaders,
      body: createByteStreamDefinyValue(reqBodyBytes),
    };
    return await callDefinyFunction(evaluated, reqValue);
  }

  return evaluated;
}

/**
 * 純粋関数型 HTTP レスポンス値 `{ status: Number, headers: List<{ name: String, value: String }>, body: { initialState, next } }` を
 * Web 標準の `ReadableStream<Uint8Array>` を持つ `Response` に変換する。
 * JSON の暗黙変換や文字列の HTML 自動判定などの短絡的な変換は一切行わない。
 */
export function definyValueToHttpResponse(
  value: DefinyValue,
  appId: string,
  corsHeaders: Readonly<Record<string, string>>,
): Response {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    "__variant" in value ||
    "__fn" in value ||
    "__nativeFn" in value
  ) {
    throw new Error(
      "Expected HTTP response record { status: Number, headers: List<{ name: String, value: String }>, body: ByteStream }",
    );
  }

  const rec = value as Record<string, DefinyValue>;
  if (typeof rec.status !== "number") {
    throw new Error("HTTP response record is missing 'status: Number'");
  }
  if (!Array.isArray(rec.headers)) {
    throw new Error(
      "HTTP response record is missing 'headers: List<{ name: String, value: String }>'",
    );
  }
  const bodyVal = rec.body;
  if (
    !bodyVal ||
    typeof bodyVal !== "object" ||
    Array.isArray(bodyVal) ||
    !("initialState" in bodyVal) ||
    !("next" in bodyVal)
  ) {
    throw new Error(
      "HTTP response record 'body' must be a ByteStream { initialState: State, next: fn(State) => StreamStep }",
    );
  }

  const status = rec.status >= 100 && rec.status <= 599 ? rec.status : 200;
  const responseHeaders = new Headers({
    "X-Definy-Preview-App": appId,
    ...corsHeaders,
  });

  for (const item of rec.headers) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const hObj = item as Record<string, DefinyValue>;
      if (typeof hObj.name === "string" && typeof hObj.value === "string") {
        const name = hObj.name.trim();
        if (name.length > 0) {
          responseHeaders.append(name, hObj.value);
        }
      }
    }
  }

  const bodyObj = bodyVal as {
    readonly initialState: DefinyValue;
    readonly next: DefinyValue;
  };
  let currentState: DefinyValue = bodyObj.initialState;
  const nextFn = bodyObj.next;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const step = await callDefinyFunction(nextFn, currentState);
        if (!step || typeof step !== "object" || !("__variant" in step)) {
          controller.error(
            new Error(
              "Invalid StreamStep returned from body.next(state): expected variant yield or done",
            ),
          );
          return;
        }
        const variant = step as {
          readonly __variant: string;
          readonly payload: DefinyValue;
        };
        if (variant.__variant === "done") {
          controller.close();
          return;
        }
        if (variant.__variant === "yield") {
          const payload = variant.payload as Record<string, DefinyValue> | null;
          if (
            !payload ||
            typeof payload !== "object" ||
            !Array.isArray(payload.chunk)
          ) {
            controller.error(
              new Error(
                "Invalid yield payload: expected { chunk: List<Number>, nextState: State }",
              ),
            );
            return;
          }
          const chunkBytes = new Uint8Array(payload.chunk.length);
          for (let i = 0; i < payload.chunk.length; i++) {
            chunkBytes[i] = Number(payload.chunk[i]) & 0xff;
          }
          currentState = payload.nextState ?? null;
          controller.enqueue(chunkBytes);
          return;
        }
        controller.error(
          new Error(`Unknown StreamStep variant tag: ${variant.__variant}`),
        );
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    status,
    headers: responseHeaders,
  });
}

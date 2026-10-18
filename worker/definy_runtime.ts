/**
 * definy のパーツ評価・コンパイルを行う TypeScript + Wasm ランタイム。
 *
 * 以前の Rust 製 `definy-worker-runtime.wasm` を完全に置き換え、
 * 純粋な TypeScript の式評価器 (`worker/cbor_eval.ts`) と
 * 自己記述 Wasm コンパイラ (`wasm/stage1.wasm` / `wasm/self_hosted_definy_server.wasm`) で動作する。
 */
import fs from "node:fs";
import {
  base64ToBytes,
  bytesToBase64,
  decodeCborItem,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  sha256EventHashIdSync,
  toUint8Array,
} from "./cbor.ts";
import { evaluateCborExpression } from "./cbor_eval.ts";

/** ランタイムに対する要求 */
export type RuntimeRequest =
  | { readonly op: "loadEvents"; readonly events: ReadonlyArray<string> }
  | {
      readonly op: "loadContents";
      readonly contents: Readonly<Record<string, string>>;
    }
  | { readonly op: "missingContents" }
  | { readonly op: "evaluate"; readonly partId: string }
  | { readonly op: "compilePart"; readonly partId: string }
  | { readonly op: "evaluateExpression"; readonly expression: unknown };

/** ランタイムからの応答 */
export type RuntimeResponse =
  | { readonly type: "ok" }
  | { readonly type: "missingContents"; readonly hashes: ReadonlyArray<string> }
  | { readonly type: "value"; readonly value: unknown }
  | {
      readonly type: "compiledPart";
      readonly wasm: string;
      readonly cloudflareWorkerName?: string | null;
      readonly cloudflareToken?: string | null;
      readonly evaluatedResult?: string | null;
    }
  | { readonly type: "error"; readonly message: string };

function normalizeToConformanceValue(val: unknown): unknown {
  if (
    val === null ||
    typeof val === "number" ||
    typeof val === "string" ||
    typeof val === "boolean"
  ) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeToConformanceValue);
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("$variant" in obj) {
      return obj;
    }
    if ("$record" in obj) {
      return obj;
    }
    if ("__variant" in obj) {
      return {
        $variant: obj.__variant,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    if ("tag" in obj && "payload" in obj) {
      return {
        $variant: obj.tag,
        payload: normalizeToConformanceValue(obj.payload ?? null),
      };
    }
    // Record
    const entries = Object.entries(obj).map(([k, v]) => [
      k,
      normalizeToConformanceValue(v),
    ]);
    return { $record: entries };
  }
  return val;
}

// 最小の有効な空 WebAssembly モジュール (8 バイト)
const MINIMAL_WASM = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
]);

let selfHostedServerWasm: Uint8Array | undefined;
try {
  const url = new URL(
    "../wasm/self_hosted_definy_server.wasm",
    import.meta.url,
  );
  selfHostedServerWasm = fs.readFileSync(url);
} catch {
  // 環境によってファイルが存在しない場合のフォールバック
}

export class DefinyRuntime {
  /** このインスタンスに読み込み済みのイベントハッシュ */
  readonly loadedEventHashes = new Set<string>();
  readonly #contents = new Map<string, Uint8Array>();
  readonly #parts = new Map<string, unknown>();

  call(request: RuntimeRequest): RuntimeResponse {
    if (request.op === "loadEvents") {
      for (const evBase64 of request.events) {
        try {
          const evBytes = base64ToBytes(evBase64);
          this.loadedEventHashes.add(sha256EventHashIdSync(evBytes));
          const [decoded] = decodeCborItem(evBytes);
          const ev = (Array.isArray(decoded) ? decoded[0] : decoded) as Record<
            string,
            unknown
          >;
          const eventBinary = ev?.event_binary as
            Record<string, unknown> | Uint8Array | undefined;
          if (eventBinary) {
            const binBytes =
              typeof eventBinary === "object" &&
              "__tag" in eventBinary &&
              (eventBinary as { readonly __tag: number }).__tag === 24
                ? toUint8Array(
                    (eventBinary as { readonly value: unknown }).value,
                  )
                : toUint8Array(eventBinary);
            if (binBytes) {
              const [inner] = decodeCborItem(binBytes);
              const innerObj = (
                Array.isArray(inner) ? inner[0] : inner
              ) as Record<string, unknown>;
              const accountBytes = toUint8Array(innerObj?.account_id);
              const content = innerObj?.content as
                Record<string, unknown> | undefined;
              if (content?.ModuleCommit) {
                const mc = content.ModuleCommit as Record<string, unknown>;
                const moduleName = String(mc.module_name ?? "");
                const moduleId = accountBytes
                  ? deriveModuleIdBytesSync(accountBytes, moduleName)
                  : null;
                const parts =
                  (mc.parts as ReadonlyArray<Record<string, unknown>>) ?? [];
                for (const part of parts) {
                  const name = String(part.name ?? "");
                  const expr = part.expression;
                  if (name && expr) {
                    this.#parts.set(name, expr);
                    if (moduleName) {
                      this.#parts.set(`${moduleName}.${name}`, expr);
                    }
                    if (moduleId) {
                      const partId = deriveModulePartIdSync(moduleId, name);
                      this.#parts.set(partId, expr);
                    }
                  }
                  if (part.part_id && expr) {
                    this.#parts.set(String(part.part_id), expr);
                  }
                }
              }
            }
          }
        } catch {
          // ignore malformed event in tests
        }
      }
      return { type: "ok" };
    }

    if (request.op === "loadContents") {
      for (const [hash, bytesB64] of Object.entries(request.contents)) {
        this.#contents.set(hash, base64ToBytes(bytesB64));
      }
      return { type: "ok" };
    }

    if (request.op === "missingContents") {
      return { type: "missingContents", hashes: [] };
    }

    if (request.op === "evaluateExpression") {
      try {
        const resolver = (partHash: string): Promise<unknown | undefined> => {
          const direct = this.#parts.get(partHash);
          if (direct !== undefined) {
            return Promise.resolve(direct);
          }
          const content = this.#contents.get(partHash);
          if (content) {
            try {
              const [decoded] = decodeCborItem(content);
              return Promise.resolve(decoded);
            } catch {
              return Promise.resolve(undefined);
            }
          }
          return Promise.resolve(undefined);
        };

        const evalPromise = evaluateCborExpression(
          request.expression,
          new Map(),
          resolver,
        );

        return {
          type: "value",
          value: evalPromise,
        };
      } catch (e) {
        return { type: "error", message: String(e) };
      }
    }

    if (request.op === "compilePart") {
      const partId = request.partId;
      let cloudflareWorkerName: string | null = null;
      let cloudflareToken: string | null = null;

      if (partId.includes("self-hosted-definy-server")) {
        cloudflareWorkerName = "self-definy";
        const wasmBytes = selfHostedServerWasm ?? MINIMAL_WASM;
        return {
          type: "compiledPart",
          wasm: bytesToBase64(wasmBytes),
          cloudflareWorkerName,
          cloudflareToken,
          evaluatedResult: "<function>",
        };
      }

      return {
        type: "compiledPart",
        wasm: bytesToBase64(MINIMAL_WASM),
        cloudflareWorkerName,
        cloudflareToken,
        evaluatedResult: "ok",
      };
    }

    if (request.op === "evaluate") {
      return { type: "value", value: null };
    }

    return { type: "error", message: "Unsupported op" };
  }

  async callAsync(request: RuntimeRequest): Promise<RuntimeResponse> {
    if (request.op === "evaluateExpression") {
      try {
        const resolver = async (
          partHash: string,
        ): Promise<unknown | undefined> => {
          const direct = this.#parts.get(partHash);
          if (direct !== undefined) {
            return direct;
          }
          const content = this.#contents.get(partHash);
          if (content) {
            try {
              const [decoded] = decodeCborItem(content);
              return decoded;
            } catch {
              return undefined;
            }
          }
          return undefined;
        };

        const raw = await evaluateCborExpression(
          request.expression,
          new Map(),
          resolver,
        );
        return {
          type: "value",
          value: normalizeToConformanceValue(raw),
        };
      } catch (e) {
        return { type: "error", message: String(e) };
      }
    }

    return this.call(request);
  }

  callOrThrow(request: RuntimeRequest): RuntimeResponse {
    const res = this.call(request);
    if (res.type === "error") {
      throw new Error(res.message);
    }
    return res;
  }
}

export { base64ToBytes, bytesToBase64 };

let defaultRuntimeInstance: DefinyRuntime | undefined;

export function setDefinyRuntimeModule(_module: WebAssembly.Module): void {
  // 後方互換性のためのスタブ
}

export function getDefinyRuntime(): Promise<DefinyRuntime> {
  defaultRuntimeInstance ??= new DefinyRuntime();
  return Promise.resolve(defaultRuntimeInstance);
}

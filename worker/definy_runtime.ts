/**
 * definy のパーツを実行する Wasm モジュール（`definy-worker-runtime` クレート）の TypeScript ラッパー。
 *
 * Cloudflare Workers は実行時に生成した Wasm をコンパイルできないため、definy の Wasm コンパイラと
 * Wasm インタプリタ (wasmi) をまとめたこのモジュールを事前にアップロードして使う。
 * 式の評価は Rust サーバーと同じ実装（Wasm にコンパイルして実行）で行う。
 *
 * ビルド: `cargo build -p definy-worker-runtime --release --target wasm32-unknown-unknown`
 * （`scripts/build-assets.sh` が `worker/generated/definy_worker_runtime.wasm` にコピーする）
 */

/** Rust 側 `definy_worker_runtime::Request` に対応する要求 */
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

/** Rust 側 `definy_worker_runtime::Response` に対応する応答 */
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

interface RuntimeExports {
  readonly memory: WebAssembly.Memory;
  readonly definy_alloc: (len: number) => number;
  readonly definy_free: (ptr: number, len: number) => void;
  readonly definy_call: (ptr: number, len: number) => number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

export class DefinyRuntime {
  readonly #exports: RuntimeExports;
  /** このインスタンスに読み込み済みのイベントハッシュ（isolate が生きている間は使い回す） */
  readonly loadedEventHashes = new Set<string>();

  private constructor(exports: RuntimeExports) {
    this.#exports = exports;
  }

  static async create(module: WebAssembly.Module): Promise<DefinyRuntime> {
    // 依存クレート（chrono の wasmbind など）が JS の関数を import していても、ランタイムの処理では
    // 呼ばれない想定なので、呼ばれたら例外を投げるスタブで埋める
    const imports: Record<string, Record<string, () => never>> = {};
    for (const entry of WebAssembly.Module.imports(module)) {
      if (entry.kind !== "function") continue;
      imports[entry.module] ??= {};
      imports[entry.module][entry.name] = () => {
        throw new Error(
          `definy runtime called unsupported import ${entry.module}.${entry.name}`,
        );
      };
    }
    const instance = await WebAssembly.instantiate(module, imports);
    return new DefinyRuntime(instance.exports as unknown as RuntimeExports);
  }

  /** JSON の要求を送り、応答を返す */
  call(request: RuntimeRequest): RuntimeResponse {
    const exports = this.#exports;
    const input = new TextEncoder().encode(JSON.stringify(request));
    const inputPtr = exports.definy_alloc(input.length);
    new Uint8Array(exports.memory.buffer, inputPtr, input.length).set(input);
    const outputPtr = exports.definy_call(inputPtr, input.length);
    exports.definy_free(inputPtr, input.length);
    const length = new DataView(exports.memory.buffer).getUint32(
      outputPtr,
      true,
    );
    const output = new Uint8Array(exports.memory.buffer, outputPtr + 4, length)
      .slice();
    exports.definy_free(outputPtr, 4 + length);
    return JSON.parse(new TextDecoder().decode(output)) as RuntimeResponse;
  }

  /** エラー応答なら例外にする */
  callOrThrow(request: RuntimeRequest): RuntimeResponse {
    const response = this.call(request);
    if (response.type === "error") {
      throw new Error(response.message);
    }
    return response;
  }
}

export { base64ToBytes, bytesToBase64 };

let runtimeModule: WebAssembly.Module | undefined;
let runtimePromise: Promise<DefinyRuntime> | undefined;

/** Worker のエントリポイント（またはテスト）から、ランタイムの Wasm モジュールを設定する */
export function setDefinyRuntimeModule(module: WebAssembly.Module): void {
  runtimeModule = module;
  runtimePromise = undefined;
}

/** 設定済みのモジュールからランタイムを取得する（isolate ごとに 1 回だけ初期化） */
export function getDefinyRuntime(): Promise<DefinyRuntime> {
  if (!runtimeModule) {
    return Promise.reject(
      new Error(
        "definy runtime Wasm module is not configured (build definy-worker-runtime and call setDefinyRuntimeModule)",
      ),
    );
  }
  runtimePromise ??= DefinyRuntime.create(runtimeModule);
  return runtimePromise;
}

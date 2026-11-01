/**
 * ブラウザで stage1 コンパイラを読み込む.
 * `wasm/stage1.wasm` は Vite がビルド時にハッシュ付きの静的アセットとして出力する.
 * (`?url` の import は Void の dev サーバーが JS ではなく `application/wasm` で返して読み込めないため
 * `new URL(..., import.meta.url)` で参照する).
 * 実行パネルでコンパイラを作り直していれば, そちらを使う (src/rebuilt_compiler.ts)
 */
import { loadRebuiltCompiler } from "./rebuilt_compiler.ts";
import {
  createStage1Compiler,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";

let bundledBytesPromise: Promise<Uint8Array> | null = null;
let compilerPromise: {
  readonly bytes: Uint8Array | null;
  readonly promise: Promise<Stage1CompilerInstance>;
} | null = null;

/**
 * 同梱の stage1.wasm のバイト列を取得する.
 * 取得は 1 度だけ行い, 失敗した場合は次回呼び出し時に再試行する
 */
function loadBundledStage1Bytes(): Promise<Uint8Array> {
  bundledBytesPromise ??= (async () => {
    const res = await fetch(new URL("../wasm/stage1.wasm", import.meta.url));
    if (!res.ok) {
      throw new Error(
        `Failed to fetch stage1.wasm: ${res.status} ${res.statusText}`,
      );
    }
    return new Uint8Array(await res.arrayBuffer());
  })().catch((e: unknown) => {
    bundledBytesPromise = null;
    throw e;
  });
  return bundledBytesPromise;
}

/** 今使うコンパイラのバイト列 (作り直したものがあればそちら) */
export async function loadStage1Bytes(): Promise<Uint8Array> {
  return loadRebuiltCompiler()?.compiler ?? (await loadBundledStage1Bytes());
}

/**
 * stage1 コンパイラを作る. 使うコンパイラが変わらない間は 1 度だけコンパイルし,
 * 失敗した場合は次回呼び出し時に再試行する
 */
export function loadStage1Compiler(): Promise<Stage1CompilerInstance> {
  const rebuilt = loadRebuiltCompiler()?.compiler ?? null;
  if (compilerPromise === null || compilerPromise.bytes !== rebuilt) {
    const promise = (async () =>
      createStage1Compiler(
        await WebAssembly.compile(
          (rebuilt ?? (await loadBundledStage1Bytes())) as BufferSource,
        ),
      ))();
    promise.catch(() => {
      compilerPromise = null;
    });
    compilerPromise = { bytes: rebuilt, promise };
  }
  return compilerPromise.promise;
}

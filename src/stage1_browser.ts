/**
 * ブラウザで stage1 コンパイラを読み込む.
 * `wasm/stage1.wasm` は Vite がビルド時にハッシュ付きの静的アセットとして出力する.
 * (`?url` の import は Void の dev サーバーが JS ではなく `application/wasm` で返して読み込めないため
 * `new URL(..., import.meta.url)` で参照する)
 */
import {
  createStage1Compiler,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";

let stage1CompilerPromise: Promise<Stage1CompilerInstance> | null = null;

/**
 * stage1.wasm を取得して stage1 コンパイラを作る。
 * 取得・コンパイルは 1 度だけ行い、失敗した場合は次回呼び出し時に再試行する。
 */
export function loadStage1Compiler(): Promise<Stage1CompilerInstance> {
  stage1CompilerPromise ??= (async () => {
    const res = await fetch(new URL("../wasm/stage1.wasm", import.meta.url));
    if (!res.ok) {
      throw new Error(
        `Failed to fetch stage1.wasm: ${res.status} ${res.statusText}`,
      );
    }
    return createStage1Compiler(
      await WebAssembly.compile(await res.arrayBuffer()),
    );
  })().catch((e: unknown) => {
    stage1CompilerPromise = null;
    throw e;
  });
  return stage1CompilerPromise;
}

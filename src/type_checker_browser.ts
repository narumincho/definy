/**
 * ブラウザで definy 製の型チェッカーを読み込む.
 * サーバーの `SubmitEvent` と同じ, `npm run build:seeds` が作った `wasm/type_checker.wasm` を使う
 * (Vite がハッシュ付きの静的アセットとして出力する. 読み込み方は stage1_browser.ts と同じ).
 * 実行パネルでコンパイラを作り直していれば, そのコンパイラでコンパイルした型チェッカーを使う (src/rebuilt_compiler.ts)
 */
import { loadRebuiltCompiler } from "./rebuilt_compiler.ts";

let typeCheckerPromise: {
  readonly bytes: Uint8Array | null;
  readonly promise: Promise<WebAssembly.Module>;
} | null = null;

/** 型チェッカーの Wasm を取得してコンパイルする. 使うものが変わらない間は 1 度だけ行い, 失敗したら次の呼び出しで再試行する */
export function loadTypeChecker(): Promise<WebAssembly.Module> {
  const rebuilt = loadRebuiltCompiler()?.typeChecker ?? null;
  if (typeCheckerPromise === null || typeCheckerPromise.bytes !== rebuilt) {
    const promise = (async () => {
      if (rebuilt !== null) {
        return await WebAssembly.compile(rebuilt as BufferSource);
      }
      const res = await fetch(
        new URL("../wasm/type_checker.wasm", import.meta.url),
      );
      if (!res.ok) {
        throw new Error(
          `Failed to fetch type_checker.wasm: ${res.status} ${res.statusText}`,
        );
      }
      return await WebAssembly.compile(await res.arrayBuffer());
    })();
    promise.catch(() => {
      typeCheckerPromise = null;
    });
    typeCheckerPromise = { bytes: rebuilt, promise };
  }
  return typeCheckerPromise.promise;
}

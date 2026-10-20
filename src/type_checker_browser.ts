/**
 * ブラウザで definy 製の型チェッカーを読み込む.
 * サーバーの `SubmitEvent` と同じ, `npm run build:seeds` が作った `wasm/type_checker.wasm` を使う
 * (Vite がハッシュ付きの静的アセットとして出力する. 読み込み方は stage1_browser.ts と同じ)
 */
let typeCheckerPromise: Promise<WebAssembly.Module> | null = null;

/** 型チェッカーの Wasm を取得してコンパイルする. 1 度だけ行い, 失敗したら次の呼び出しで再試行する */
export function loadTypeChecker(): Promise<WebAssembly.Module> {
  typeCheckerPromise ??= (async () => {
    const res = await fetch(
      new URL("../wasm/type_checker.wasm", import.meta.url),
    );
    if (!res.ok) {
      throw new Error(
        `Failed to fetch type_checker.wasm: ${res.status} ${res.statusText}`,
      );
    }
    return await WebAssembly.compile(await res.arrayBuffer());
  })().catch((e: unknown) => {
    typeCheckerPromise = null;
    throw e;
  });
  return typeCheckerPromise;
}

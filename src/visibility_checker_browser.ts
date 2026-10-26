/**
 * ブラウザで definy 製の公開/非公開の参照の検査 (`core.check-reference-visibility`) を読み込む.
 * サーバーの `SubmitEvent` と同じ, `npm run build:seeds` が作った `wasm/visibility_checker.wasm` を使う
 * (読み込み方は type_checker_browser.ts と同じ)
 */
let visibilityCheckerPromise: Promise<WebAssembly.Module> | null = null;

/** 検査の Wasm を取得してコンパイルする. 1 度だけ行い, 失敗したら次の呼び出しで再試行する */
export function loadVisibilityChecker(): Promise<WebAssembly.Module> {
  if (visibilityCheckerPromise === null) {
    visibilityCheckerPromise = (async () => {
      const res = await fetch(
        new URL("../wasm/visibility_checker.wasm", import.meta.url),
      );
      if (!res.ok) {
        throw new Error(
          `Failed to fetch visibility_checker.wasm: ${res.status} ${res.statusText}`,
        );
      }
      return await WebAssembly.compile(await res.arrayBuffer());
    })();
    visibilityCheckerPromise.catch(() => {
      visibilityCheckerPromise = null;
    });
  }
  return visibilityCheckerPromise;
}

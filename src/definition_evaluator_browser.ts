/**
 * ブラウザで definy 製の評価器 (`core.eval-value`) を読み込む. ユーザーが作った定義のパーツで定義したパーツの中身を
 * コミットの中で評価するのに使う (docs/part-definition.md). サーバーと同じ, `npm run build:seeds` が作った
 * `wasm/definition_evaluator.wasm` を使う (読み込み方は type_checker_browser.ts と同じ)
 */
let evaluatorPromise: Promise<WebAssembly.Module> | null = null;
let loadedEvaluator: WebAssembly.Module | undefined;

/** 評価器の Wasm を取得してコンパイルする. 1 度だけ行い, 失敗したら次の呼び出しで再試行する */
export function loadDefinitionEvaluator(): Promise<WebAssembly.Module> {
  evaluatorPromise ??= (async () => {
    const res = await fetch(
      new URL("../wasm/definition_evaluator.wasm", import.meta.url),
    );
    if (!res.ok) {
      throw new Error(
        `Failed to fetch definition_evaluator.wasm: ${res.status} ${res.statusText}`,
      );
    }
    const module = await WebAssembly.compile(await res.arrayBuffer());
    loadedEvaluator = module;
    return module;
  })();
  evaluatorPromise.catch(() => {
    evaluatorPromise = null;
  });
  return evaluatorPromise;
}

/** 読み込み終わった評価器 (まだなら `undefined`) */
export function loadedDefinitionEvaluator(): WebAssembly.Module | undefined {
  return loadedEvaluator;
}

/**
 * ブラウザで同梱の Wasm (stage1 コンパイラと, `npm run build:seeds` が definy の関数をコンパイルした `wasm/*.wasm`) を読み込む.
 *
 * Wasm は Vite がビルド時にハッシュ付きの静的アセットとして出力する. `?url` の import は Void の dev サーバーが
 * JS ではなく `application/wasm` で返して読み込めないため, `new URL("../wasm/....wasm", import.meta.url)` で参照する
 * (Vite が見つけられるよう URL はリテラルで書く).
 *
 * どれも取得とコンパイルは 1 度だけ行い, 失敗したら次の呼び出しで再試行する.
 * 実行パネルでコンパイラを作り直していれば, stage1 と型チェッカーはそちらを使う (src/rebuilt_compiler.ts)
 */
import { loadRebuiltCompiler } from "./rebuilt_compiler.ts";
import {
  createStage1Compiler,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";

/** `load` の結果を覚える. 失敗したら覚えず, 次の呼び出しでもう一度 `load` する */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((e: unknown) => {
      promise = null;
      throw e;
    });
    return promise;
  };
}

/**
 * `load(key)` の結果を, `key` が前の呼び出しと同じ (`===`) 間は覚える.
 * 失敗したら覚えず, 次の呼び出しでもう一度 `load` する
 */
function oncePerKey<K, T>(
  load: (key: K) => Promise<T>,
): (key: K) => Promise<T> {
  let cached: { readonly key: K; readonly promise: Promise<T> } | null = null;
  return (key) => {
    if (cached === null || cached.key !== key) {
      const promise = load(key);
      const entry = { key, promise };
      promise.catch(() => {
        if (cached === entry) {
          cached = null;
        }
      });
      cached = entry;
    }
    return cached.promise;
  };
}

async function fetchBytes(url: URL): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    const name = url.pathname.split("/").pop();
    throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

function compile(bytes: Uint8Array): Promise<WebAssembly.Module> {
  return WebAssembly.compile(bytes as BufferSource);
}

const bundledStage1Bytes = once(() =>
  fetchBytes(new URL("../wasm/stage1.wasm", import.meta.url)),
);

/** 今使うコンパイラのバイト列 (作り直したものがあればそちら) */
export async function loadStage1Bytes(): Promise<Uint8Array> {
  return loadRebuiltCompiler()?.compiler ?? (await bundledStage1Bytes());
}

const stage1Compiler = oncePerKey(
  async (rebuilt: Uint8Array | null): Promise<Stage1CompilerInstance> =>
    createStage1Compiler(
      await compile(rebuilt ?? (await bundledStage1Bytes())),
    ),
);

/** stage1 コンパイラ. 使うコンパイラが変わらない間は 1 度だけコンパイルする */
export function loadStage1Compiler(): Promise<Stage1CompilerInstance> {
  return stage1Compiler(loadRebuiltCompiler()?.compiler ?? null);
}

const typeChecker = oncePerKey(
  async (rebuilt: Uint8Array | null): Promise<WebAssembly.Module> =>
    compile(
      rebuilt ??
        (await fetchBytes(
          new URL("../wasm/type_checker.wasm", import.meta.url),
        )),
    ),
);

/**
 * definy 製の型チェッカー. サーバーの `SubmitEvent` と同じ `wasm/type_checker.wasm` を使う.
 * 使うものが変わらない間は 1 度だけコンパイルする
 */
export function loadTypeChecker(): Promise<WebAssembly.Module> {
  return typeChecker(loadRebuiltCompiler()?.typeChecker ?? null);
}

/**
 * definy 製の公開/非公開の参照の検査 (`core.check-reference-visibility`).
 * サーバーの `SubmitEvent` と同じ `wasm/visibility_checker.wasm` を使う
 */
export const loadVisibilityChecker = once(async () =>
  compile(
    await fetchBytes(
      new URL("../wasm/visibility_checker.wasm", import.meta.url),
    ),
  ),
);

let loadedEvaluator: WebAssembly.Module | undefined;

/**
 * definy 製の評価器 (`core.eval-value`). ユーザーが作った定義のパーツで定義したパーツの中身を
 * コミットの中で評価するのに使う (docs/part-definition.md). サーバーは service.wasm の中で同じ `core.eval-value` を呼ぶ
 */
export const loadDefinitionEvaluator = once(async () => {
  const module = await compile(
    await fetchBytes(
      new URL("../wasm/definition_evaluator.wasm", import.meta.url),
    ),
  );
  loadedEvaluator = module;
  return module;
});

/** 読み込み終わった評価器 (まだなら `undefined`) */
export function loadedDefinitionEvaluator(): WebAssembly.Module | undefined {
  return loadedEvaluator;
}

/**
 * 実行パネルで作り直したコンパイラと型チェッカー (docs/run-panel.md「コンパイラを作り直す」).
 * このブラウザの localStorage にだけ保存し, あれば同梱の `wasm/stage1.wasm` と `wasm/type_checker.wasm` の代わりに使う
 * (stage1_browser.ts, type_checker_browser.ts)
 */
import { base64ToBytes, bytesToBase64 } from "./cbor.ts";

export type RebuiltCompiler = {
  /** 不動点のコンパイラ (`core.compile-to-wasm` を自分自身でコンパイルしたもの) */
  readonly compiler: Uint8Array;
  /** `compiler` で `core.type-checker` をコンパイルしたもの */
  readonly typeChecker: Uint8Array;
  readonly builtAtMs: number;
};

const STORAGE_KEY = "definy.rebuilt-compiler";

/** 読み込んだもの. 保存し直すか消すまで使い回す (`undefined` はまだ読んでいない) */
let current: RebuiltCompiler | null | undefined;
const listeners = new Set<() => void>();

export function loadRebuiltCompiler(): RebuiltCompiler | null {
  if (current !== undefined) {
    return current;
  }
  current = null;
  try {
    const saved: unknown = JSON.parse(
      globalThis.localStorage?.getItem(STORAGE_KEY) ?? "null",
    );
    if (
      typeof saved === "object" &&
      saved !== null &&
      "compiler" in saved &&
      "typeChecker" in saved &&
      "builtAtMs" in saved &&
      typeof saved.compiler === "string" &&
      typeof saved.typeChecker === "string" &&
      typeof saved.builtAtMs === "number"
    ) {
      current = {
        compiler: base64ToBytes(saved.compiler),
        typeChecker: base64ToBytes(saved.typeChecker),
        builtAtMs: saved.builtAtMs,
      };
    }
  } catch {
    // 読めなければ同梱のものを使う
  }
  return current;
}

/** 作り直したコンパイラを使う (`null` で同梱のものに戻す) */
export function saveRebuiltCompiler(rebuilt: RebuiltCompiler | null): void {
  current = rebuilt;
  try {
    if (rebuilt === null) {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } else {
      globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify({
          compiler: bytesToBase64(rebuilt.compiler),
          typeChecker: bytesToBase64(rebuilt.typeChecker),
          builtAtMs: rebuilt.builtAtMs,
        }),
      );
    }
  } catch {
    // 保存できなくても, このページを開いている間は使う
  }
  for (const listener of listeners) {
    listener();
  }
}

/** 使うコンパイラが変わったら呼ぶ (型チェックをやり直すため). 返り値で登録をやめる */
export function onRebuiltCompilerChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

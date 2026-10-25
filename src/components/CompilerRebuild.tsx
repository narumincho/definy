import { useEffect, useState, type JSX } from "react";
import { label } from "../language.ts";
import { compileTypeCheckerWith, selfCompile } from "../compiler_rebuild.ts";
import {
  loadRebuiltCompiler,
  onRebuiltCompilerChange,
  saveRebuiltCompiler,
  type RebuiltCompiler,
} from "../rebuilt_compiler.ts";
import { loadStage1Bytes } from "../stage1_browser.ts";
import type { LanguageCode } from "../types.ts";

/** 作り直すときに, できたコンパイラで自分自身をコンパイルし直す最大の回数 */
const MAX_REBUILD_ROUNDS = 5;

type RebuildStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "building" }
  | {
      readonly kind: "done";
      readonly rounds: number;
      readonly partCount: number;
    }
  | { readonly kind: "error"; readonly message: string };

/**
 * 実行パネルの「コンパイラを作り直す」(docs/run-panel.md). 表示中のパーツ (作業中の変更を含む) の
 * `core.compile-to-wasm` を今のコンパイラでコンパイルし, 不動点になったコンパイラと, それでコンパイルした
 * `core.type-checker` をこのブラウザで使う
 */
export function CompilerRebuild({
  language,
  resolvePart,
  partNames,
}: {
  readonly language: LanguageCode;
  readonly resolvePart: (partIdHash: string) => unknown;
  readonly partNames: ReadonlyMap<string, string>;
}): JSX.Element {
  // SSR と揃えるため, 描画した後に保存したものを読む
  const [rebuilt, setRebuilt] = useState<RebuiltCompiler | null>(null);
  const [status, setStatus] = useState<RebuildStatus>({ kind: "idle" });
  useEffect(() => {
    setRebuilt(loadRebuiltCompiler());
    return onRebuiltCompilerChange(() => {
      setRebuilt(loadRebuiltCompiler());
    });
  }, []);

  // 作り直したコンパイラをダウンロードする URL (リポジトリの wasm/stage1.wasm にできる)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  useEffect(() => {
    if (rebuilt === null) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([rebuilt.compiler as BlobPart], { type: "application/wasm" }),
    );
    setDownloadUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [rebuilt]);

  const rebuild = async (): Promise<void> => {
    setStatus({ kind: "building" });
    // 「作り直し中」を描画してから, 重い処理を始める
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = selfCompile({
        compiler: await loadStage1Bytes(),
        resolvePart,
        maxRounds: MAX_REBUILD_ROUNDS,
      });
      switch (result.kind) {
        case "unresolved_parts":
          setStatus({
            kind: "error",
            message: label(
              language,
              `Cannot compile these parts: ${result.partIds.map((id) => partNames.get(id) ?? id).join(", ")}`,
              `コンパイルできないパーツがあります: ${result.partIds.map((id) => partNames.get(id) ?? id).join(", ")}`,
              `Ne eblas kompili ĉi tiujn partojn: ${result.partIds.map((id) => partNames.get(id) ?? id).join(", ")}`,
            ),
          });
          return;
        case "not_fixed_point":
          setStatus({
            kind: "error",
            message: label(
              language,
              `The compiler did not reach a fixed point (${result.sizes[0]} and ${result.sizes[1]} bytes)`,
              `コンパイラが不動点になりませんでした (${result.sizes[0]} バイトと ${result.sizes[1]} バイト)`,
              `La kompililo ne atingis fikspunkton (${result.sizes[0]} kaj ${result.sizes[1]} bajtoj)`,
            ),
          });
          return;
        case "fixed_point":
          saveRebuiltCompiler({
            compiler: result.compiler,
            typeChecker: compileTypeCheckerWith(result.compiler, resolvePart),
            builtAtMs: Date.now(),
          });
          setStatus({
            kind: "done",
            rounds: result.rounds,
            partCount: result.partCount,
          });
          return;
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="compiler-rebuild">
      <span
        className="compiler-rebuild-current"
        data-rebuilt={rebuilt !== null}
      >
        {rebuilt === null
          ? label(
              language,
              "Compiler: bundled stage1",
              "コンパイラ: 同梱の stage1",
              "Kompililo: enpakita stage1",
            )
          : label(
              language,
              `Compiler: rebuilt at ${new Date(rebuilt.builtAtMs).toLocaleTimeString(language)} (${rebuilt.compiler.length} bytes)`,
              `コンパイラ: ${new Date(rebuilt.builtAtMs).toLocaleTimeString(language)} に作り直したもの (${rebuilt.compiler.length} バイト)`,
              `Kompililo: rekonstruita je ${new Date(rebuilt.builtAtMs).toLocaleTimeString(language)} (${rebuilt.compiler.length} bajtoj)`,
            )}
      </span>
      {status.kind === "building" && (
        <span className="compiler-rebuild-status" role="status">
          {label(language, "Rebuilding…", "作り直し中…", "Rekonstruante…")}
        </span>
      )}
      {status.kind === "done" && (
        <span className="compiler-rebuild-status" role="status">
          {label(
            language,
            `Rebuilt from ${status.partCount} parts (fixed point after ${status.rounds + 1} compilations)`,
            `${status.partCount} 個のパーツから作り直しました (${status.rounds + 1} 回のコンパイルで不動点)`,
            `Rekonstruita el ${status.partCount} partoj (fikspunkto post ${status.rounds + 1} kompiloj)`,
          )}
        </span>
      )}
      {status.kind === "error" && (
        <span
          className="compiler-rebuild-status"
          role="alert"
          data-error="true"
        >
          {status.message}
        </span>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm compiler-rebuild-button"
        disabled={status.kind === "building"}
        title={label(
          language,
          "Compile core.compile-to-wasm of the shown parts (with working changes) with the current compiler, and use it and its type checker in this browser",
          "表示中のパーツ (作業中の変更を含む) の core.compile-to-wasm を今のコンパイラでコンパイルし, できたコンパイラと型チェッカーをこのブラウザで使う",
          "Kompili core.compile-to-wasm de la montritaj partoj per la nuna kompililo kaj uzi ĝin en ĉi tiu retumilo",
        )}
        onClick={() => {
          void rebuild();
        }}
      >
        {label(
          language,
          "Rebuild Compiler",
          "コンパイラを作り直す",
          "Rekonstrui kompililon",
        )}
      </button>
      {rebuilt !== null && (
        <>
          {downloadUrl !== null && (
            <a
              className="btn btn-secondary btn-sm"
              href={downloadUrl}
              download="stage1.wasm"
            >
              {label(language, "Download", "ダウンロード", "Elŝuti")}
            </a>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm compiler-rebuild-reset"
            onClick={() => {
              saveRebuiltCompiler(null);
              setStatus({ kind: "idle" });
            }}
          >
            {label(
              language,
              "Use Bundled",
              "同梱のものに戻す",
              "Uzi enpakitan",
            )}
          </button>
        </>
      )}
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useRouter } from "@void/react";
import { CloseIcon, PlayIcon } from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { loadStage1Compiler } from "../stage1_browser.ts";
import { CompilerRebuild } from "./CompilerRebuild.tsx";
import {
  formatRunValue,
  formatWasiIoStep,
  runExpression,
  runValueExpression,
  type RunOutcome,
} from "../run_expression.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import {
  addRunEntry,
  loadRunHistory,
  saveRunHistory,
  setRunOutcome,
  type RunHistoryEntry,
} from "../run_history.ts";
import {
  browserWasiIoHandler,
  loadSecret,
  loadWasiIoSettings,
  recordSecretUse,
} from "../wasi_io_browser.ts";
import { ExpressionTreeEditor } from "../tree_layout/ExpressionTreeEditor.tsx";
import {
  hole,
  isHole,
  partReferenceExpression,
} from "../tree_layout/expression.ts";
import { partParameters, partSelection } from "../tree_layout/selection.ts";
import { probeInferredTypeAt } from "../tree_layout/type_inference.ts";
import type { LanguageCode } from "../types.ts";

/** 実行パネルの入力欄の式のツリーの枠の ID */
const INPUT_TREE_ID = "run-panel-input-tree";

/** シークレットの使用履歴に残す, 実行した場所の名前 */
const RUN_PANEL_SOURCE = "run-panel";

/**
 * ターミナルのような実行パネル (docs/run-panel.md). エディタ領域の下に出し, ページを移っても出したままにできる.
 * 式を木構造のエディタで入力して実行し, 実行履歴から再実行できる
 */
export function RunPanel(): JSX.Element {
  const {
    language,
    parts,
    partsByIdHash,
    partNames,
    workingChanges,
    findExpectedType,
    currentAccount,
    runPanelOpen,
    setRunPanelOpen,
  } = useDefiny();
  const currentPath = useRouter().path;

  const [input, setInput] = useState<unknown>(hole);
  const [history, setHistory] = useState<ReadonlyArray<RunHistoryEntry>>([]);
  // SSR と揃えるため空から始め, 描画した後に保存した履歴を読む
  const [loaded, setLoaded] = useState(false);
  // 次に足す記録の番号. 保存した履歴の番号と重ならないようにする
  const nextIdRef = useRef(1);
  useEffect(() => {
    const saved = loadRunHistory();
    nextIdRef.current = saved.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    setHistory(saved);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      saveRunHistory(history);
    }
  }, [history, loaded]);

  // パーツの式 (作業中の変更があればそちら)
  const resolvePart = useCallback(
    (partIdHash: string): unknown => {
      // 作業中の変更は表示中 (`module.name` ごとに最新) のパーツに対するものだけ使う
      const shown = parts.find((p) => p.partIdHash === partIdHash);
      const shownChange =
        shown === undefined
          ? undefined
          : workingChanges.parts.get(shown.partId);
      return shownChange?.expression !== undefined
        ? shownChange.expression
        : partsByIdHash.get(partIdHash)?.expression;
    },
    [parts, partsByIdHash, workingChanges],
  );

  const run = useCallback(
    async (expression: unknown): Promise<void> => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setHistory((prev) =>
        addRunEntry(prev, { id, expression, ranAtMs: Date.now() }),
      );
      const finish = (outcome: RunOutcome): void => {
        setHistory((prev) => setRunOutcome(prev, id, outcome));
      };
      let compiler;
      try {
        compiler = await loadStage1Compiler();
      } catch (e) {
        finish({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
        return;
      }
      const secretKeyBase64 = currentAccount?.secretKeyBase64;
      // 結果の表示 (浮動小数か整数か) のため, 実行と並べて式の型を型チェッカーに聞く
      const typePromise = findExpectedType({
        partType: hole(),
        expression: probeInferredTypeAt(expression, []),
      }).catch((): null => null);
      const outcome = await runExpression(expression, {
        compiler,
        resolvePart,
        wasiIoHost: {
          handle: browserWasiIoHandler(
            loadWasiIoSettings(),
            currentAccount !== null && secretKeyBase64 !== undefined
              ? { ...currentAccount, secretKeyBase64 }
              : null,
          ),
          getSecret: loadSecret,
          onSecretUse: (use) => {
            recordSecretUse(use, RUN_PANEL_SOURCE);
          },
        },
        onProgress: (steps) => {
          finish({
            kind: "value",
            value: null,
            wasiIo: { steps, message: null },
          });
        },
      });
      finish(
        outcome.kind === "value" && outcome.wasiIo === null
          ? { ...outcome, type: await typePromise }
          : outcome,
      );
    },
    [currentAccount, resolvePart, findExpectedType],
  );

  // Ctrl + ` で実行パネルを出す・隠す (VS Code のターミナルと同じ)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setRunPanelOpen(!runPanelOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [runPanelOpen, setRunPanelOpen]);

  // 開いているパーツ (パーツ詳細のページなら) を入力にするボタン. 関数のパーツは引数を未入力にした呼び出しにする
  const openPart = currentPath.startsWith("/part/")
    ? parts.find((p) => {
        const id = decodeURIComponent(currentPath.slice("/part/".length));
        return (
          p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id
        );
      })
    : undefined;
  const openPartExpression =
    openPart?.partIdHash == null
      ? null
      : partSelection(
          partReferenceExpression(openPart.partIdHash),
          partParameters(openPart),
          hole(),
          0,
        );

  const runInput = (): void => {
    void run(input);
  };

  const runLabel = label(language, "Run", "実行", "Ruli");

  return (
    <section
      className="run-panel"
      hidden={!runPanelOpen}
      aria-label={label(language, "Run panel", "実行パネル", "Rul-panelo")}
      onKeyDown={(e) => {
        // Ctrl / Cmd + Enter で入力した式を実行する
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          runInput();
        }
      }}
    >
      <div className="run-panel-header">
        <span className="run-panel-title">
          {label(language, "Run", "実行", "Ruli")}
        </span>
        <div className="run-panel-header-spacer" />
        {openPart !== undefined && openPartExpression !== null && (
          <button
            type="button"
            className="btn btn-secondary btn-sm run-panel-use-part"
            onClick={() => {
              setInput(openPartExpression);
            }}
          >
            {label(
              language,
              `Use ${openPart.moduleName}.${openPart.name}`,
              `${openPart.moduleName}.${openPart.name} を入力`,
              `Uzi ${openPart.moduleName}.${openPart.name}`,
            )}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={history.length === 0}
          onClick={() => {
            setHistory([]);
          }}
        >
          {label(language, "Clear History", "履歴を消す", "Forviŝi historion")}
        </button>
        <button
          type="button"
          className="titlebar-icon-button run-panel-close"
          title={label(
            language,
            "Hide (Ctrl+`)",
            "閉じる (Ctrl+`)",
            "Kaŝi (Ctrl+`)",
          )}
          aria-label={label(language, "Hide", "閉じる", "Kaŝi")}
          onClick={() => {
            setRunPanelOpen(false);
          }}
        >
          <CloseIcon size={15} className="titlebar-icon" />
        </button>
      </div>

      <div className="run-panel-body">
        <CompilerRebuild
          language={language}
          resolvePart={resolvePart}
          partNames={partNames}
        />
        <div className="run-panel-input">
          <span className="run-panel-prompt" aria-hidden="true">
            &gt;
          </span>
          <div className="run-panel-input-tree">
            <ExpressionTreeEditor
              expression={input}
              onChange={(next) => {
                setInput(next);
              }}
              containerId={INPUT_TREE_ID}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm run-panel-run"
            disabled={isHole(input)}
            title={`${runLabel} (Ctrl+Enter)`}
            onClick={runInput}
          >
            <PlayIcon size={14} className="btn-icon" />
            {runLabel}
          </button>
        </div>

        {history.length === 0 ? (
          <p className="run-panel-empty">
            {label(
              language,
              "Enter an expression and run it. Runs are kept here.",
              "式を入力して実行すると, ここに実行履歴が残ります",
              "Enigu esprimon kaj rulu ĝin. Ruloj restas ĉi tie.",
            )}
          </p>
        ) : (
          <ol className="run-history">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="run-history-entry"
                data-outcome={entry.outcome?.kind ?? "running"}
              >
                <div className="run-history-entry-header">
                  <time
                    className="run-history-time"
                    dateTime={new Date(entry.ranAtMs).toISOString()}
                  >
                    {new Date(entry.ranAtMs).toLocaleTimeString(language)}
                  </time>
                  <div className="run-panel-header-spacer" />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm run-history-edit"
                    onClick={() => {
                      setInput(entry.expression);
                    }}
                  >
                    {label(language, "Edit", "入力に戻す", "Redakti")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm run-history-rerun"
                    onClick={() => {
                      void run(entry.expression);
                    }}
                  >
                    <PlayIcon size={12} className="btn-icon" />
                    {label(language, "Run Again", "再実行", "Reruli")}
                  </button>
                </div>
                <ExpressionTreeEditor
                  expression={entry.expression}
                  editable={false}
                />
                <RunOutcomeView
                  outcome={entry.outcome}
                  partNames={partNames}
                  language={language}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function RunOutcomeView({
  outcome,
  partNames,
  language,
}: {
  readonly outcome: RunOutcome | null;
  readonly partNames: ReadonlyMap<string, string>;
  readonly language: LanguageCode;
}): JSX.Element {
  if (outcome === null) {
    return (
      <pre className="run-history-output">
        {label(language, "Running...", "実行中...", "Rulante...")}
      </pre>
    );
  }
  switch (outcome.kind) {
    case "unresolved_parts":
      return (
        <pre className="run-history-output error">
          {`${label(
            language,
            "Referenced parts were not found, have no expression, or are compiler built-ins",
            "参照しているパーツが見つからないか, 式が無いか, コンパイラ組み込みのため実行できません",
            "Referencitaj partoj ne troviĝis, ne havas esprimon aŭ estas enkonstruitaj en la kompililo",
          )}: ${outcome.partIds.map((id) => partNames.get(id) ?? id).join(", ")}`}
        </pre>
      );
    case "error":
      return <pre className="run-history-output error">{outcome.message}</pre>;
    case "value":
      // wasi.io の値は値そのものではなく, 動かした I/O の記録と done のメッセージを出す
      if (outcome.wasiIo !== null) {
        return (
          <pre className="run-history-output">
            {[
              ...outcome.wasiIo.steps.map(formatWasiIoStep),
              outcome.wasiIo.message ?? "...",
            ].join("\n")}
          </pre>
        );
      }
      return <RunValueView value={outcome.value} type={outcome.type ?? null} />;
  }
}

/**
 * 結果の値を, 入力と同じ式のツリーで表示する. 式の型 `type` が分かれば浮動小数と整数を見分ける.
 * 式で書けない値 (関数など) は文字列で出す
 */
function RunValueView({
  value,
  type,
}: {
  readonly value: DefinyValue;
  readonly type: unknown;
}): JSX.Element {
  const { parts } = useDefiny();
  const floatNanPartId =
    parts.find((p) => p.moduleName === "core" && p.name === "float-nan")
      ?.partIdHash ?? undefined;
  const expression = useMemo(
    () => runValueExpression(value, { type, floatNanPartId }),
    [value, type, floatNanPartId],
  );
  if (expression === null) {
    return <pre className="run-history-output">{formatRunValue(value)}</pre>;
  }
  return (
    <div className="run-history-output run-history-value">
      <ExpressionTreeEditor expression={expression} editable={false} />
    </div>
  );
}

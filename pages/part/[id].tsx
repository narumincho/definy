import { useState, useCallback, useEffect, type JSX } from "react";
import { useParams, Link } from "@void/react";
import { PlayIcon, RedoIcon, UndoIcon } from "../../src/icons.tsx";
import { label, localizedText, withLocalizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";
import {
  collectReferencedParts,
  evaluateCompiledWasm,
  type DefinyValue,
} from "../../src/stage1_compiler.ts";
import { loadStage1Compiler } from "../../src/stage1_browser.ts";
import {
  isWasiIoValue,
  runWasiIo,
  type WasiIoStep,
} from "../../src/wasi_io.ts";
import {
  browserWasiIoHandler,
  loadSecret,
  loadWasiIoSettings,
  recordSecretUse,
} from "../../src/wasi_io_browser.ts";
import { findSecretUsages, secretLiteralOf } from "../../src/secret.ts";
import { SecretPanel } from "../../src/components/SecretPanel.tsx";
import { PartDefinitionTree } from "../../src/tree_layout/PartDefinitionTree.tsx";
import type { ExpressionTypeError } from "../../src/tree_layout/ExpressionTreeEditor.tsx";
import { isTextInput } from "../../src/tree_layout/keyboard.ts";
import type { PartChange } from "../../src/types.ts";
import {
  emptyUndoHistory,
  recordUndo,
  redo,
  undo,
  undoKeyFromEvent,
  type UndoHistory,
} from "../../src/undo_history.ts";

export default function PartDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  // パーツを切り替えたら作り直し, 選択中の行・式や評価結果を前のパーツから持ち越さない
  return <PartDetail key={id ?? ""} id={id} />;
}

function PartDetail({ id }: { readonly id: string | undefined }): JSX.Element {
  const {
    language,
    parts,
    partNames,
    partsByIdHash,
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    checkPartType,
    typeCheckMessage,
    currentAccount,
  } = useDefiny();

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<DefinyValue | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [_compiledWasm, setCompiledWasm] = useState<Uint8Array | null>(null);
  // 評価結果が wasi.io (I/O をするプログラム) のときに動かした I/O の記録と, 終わったときのメッセージ
  const [wasiIoSteps, setWasiIoSteps] = useState<ReadonlyArray<WasiIoStep>>([]);
  const [wasiIoMessage, setWasiIoMessage] = useState<string | null>(null);

  const part = parts.find(
    (p) =>
      p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id,
  ) ?? {
    partId: id ?? "unknown",
    moduleId: "core",
    moduleName: "core",
    name: id ? id.slice(0, 16) : "unknown",
    description: [],
    partType: null,
    expression: {
      Number: { value: 0 },
    },
    updatedAtMs: Date.now(),
  };

  const change = workingChanges.parts.get(part.partId);
  const hasChange = change !== undefined;
  const currentName = change?.name ?? part.name;
  usePageTitle(`${part.moduleName}.${currentName}`);
  const currentDescription = change?.description ?? part.description;
  // 作業中の変更の型 (null は型指定なし) を優先する
  const currentPartType =
    change !== undefined ? change.partType : part.partType;
  const currentExpression =
    change?.expression !== undefined ? change.expression : part.expression;

  // 元に戻す (Undo) / やり直す (Redo). このパーツの作業中の変更 (無ければ undefined) を変える前ごとに積む.
  // 履歴はこのページを開いている間だけ持つ (別のパーツへ移ると消える)
  const [history, setHistory] =
    useState<UndoHistory<PartChange | undefined>>(emptyUndoHistory);

  const applyChange = useCallback(
    (next: PartChange | undefined): void => {
      if (next === undefined) {
        discardWorkingPart(part.partId);
      } else {
        updateWorkingPart(part.partId, next);
      }
    },
    [discardWorkingPart, part.partId, updateWorkingPart],
  );

  /** 作業中の変更を変え, 変える前の値を履歴に積む. 入力欄で続けて打った変更は `mergeKey` で 1 つにまとめる */
  const changePart = (
    next: PartChange | undefined,
    mergeKey: string | null,
  ): void => {
    setHistory((prev) => recordUndo(prev, change, mergeKey, Date.now()));
    applyChange(next);
  };

  const editPart = (
    fields: Partial<
      Pick<PartChange, "name" | "description" | "partType" | "expression">
    >,
    mergeKey: string | null,
  ): void => {
    changePart(
      {
        moduleDefinitionEventHash: part.moduleId,
        partDefinitionEventHash: part.partId,
        name: currentName,
        description: currentDescription,
        partType: currentPartType,
        expression: currentExpression,
        ...fields,
      },
      mergeKey,
    );
  };

  const handleUndoKey = useCallback(
    (key: "undo" | "redo"): void => {
      const result = (key === "undo" ? undo : redo)(history, change);
      if (result === null) {
        return;
      }
      setHistory(result.history);
      applyChange(result.value);
    },
    [applyChange, change, history],
  );

  // Ctrl / Cmd + Z で元に戻す, Ctrl / Cmd + Shift + Z と Ctrl + Y でやり直す.
  // 入力欄の中ではブラウザの入力欄の Undo に任せる
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const key = undoKeyFromEvent(e);
      if (key === null || isTextInput(e.target)) {
        return;
      }
      e.preventDefault();
      handleUndoKey(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleUndoKey]);

  // 編集中の式を, 編集が 500ms 止まってから definy 製の型チェッカーで検査し (コミット済みの型環境を使う),
  // 型エラーはエラーのある式の横に出す. 検査できない式 (未入力・コンパイラ組み込み) には何も出さない.
  // 検査した後に式を編集したら, 検査し直すまで出さない (エラーの式が見つからずルートに出てしまうため)
  const partIdHash = "partIdHash" in part ? (part.partIdHash ?? null) : null;
  const secret = secretLiteralOf(currentExpression);
  const [typeCheckResult, setTypeCheckResult] = useState<{
    readonly expression: unknown;
    readonly error: ExpressionTypeError | null;
  } | null>(null);
  const typeError =
    typeCheckResult !== null && typeCheckResult.expression === currentExpression
      ? typeCheckResult.error
      : null;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      checkPartType({
        partIdHash,
        partType: currentPartType,
        expression: currentExpression,
      }).then(
        (outcome) => {
          if (cancelled) return;
          setTypeCheckResult({
            expression: currentExpression,
            error:
              outcome.kind === "type_error" || outcome.kind === "checker_failed"
                ? {
                    expression:
                      outcome.kind === "type_error" ? outcome.expression : null,
                    message: typeCheckMessage(null, outcome) ?? "",
                  }
                : null,
          });
        },
        (e: unknown) => {
          if (!cancelled) {
            setTypeCheckResult({
              expression: currentExpression,
              error: {
                expression: null,
                message: e instanceof Error ? e.message : String(e),
              },
            });
          }
        },
      );
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    checkPartType,
    typeCheckMessage,
    partIdHash,
    currentPartType,
    currentExpression,
  ]);

  const handleEvaluate = useCallback(async () => {
    setEvaluating(true);
    setEvalError(null);
    setEvalResult(null);
    setWasiIoSteps([]);
    setWasiIoMessage(null);
    try {
      const compiler = await loadStage1Compiler();

      // パーツの式 (作業中の変更があればそちら)
      const resolvePart = (partIdHash: string): unknown => {
        // 作業中の変更は表示中 (`module.name` ごとに最新) のパーツに対するものだけ使う
        const shown = parts.find((p) => p.partIdHash === partIdHash);
        const shownChange =
          shown === undefined
            ? undefined
            : workingChanges.parts.get(shown.partId);
        return shownChange?.expression !== undefined
          ? shownChange.expression
          : partsByIdHash.get(partIdHash)?.expression;
      };

      // 式が参照するパーツを集めて stage1 に渡す
      const { parts: referencedParts, unresolved } = collectReferencedParts(
        currentExpression,
        resolvePart,
      );
      if (unresolved.length > 0) {
        throw new Error(
          `${label(
            language,
            "Referenced parts were not found, have no expression, or are compiler built-ins",
            "参照しているパーツが見つからないか, 式が無いか, コンパイラ組み込みのため評価できません",
            "Referencitaj partoj ne troviĝis, ne havas esprimon aŭ estas enkonstruitaj en la kompililo",
          )}: ${unresolved.map((partIdHash) => partNames.get(partIdHash) ?? partIdHash).join(", ")}`,
        );
      }

      const wasm = compiler.compile(currentExpression, referencedParts);
      setCompiledWasm(wasm);

      const result = await evaluateCompiledWasm(wasm);
      setEvalResult(result);

      // wasi.io の値なら, I/O をしながら最後 (done) まで動かす
      if (isWasiIoValue(result)) {
        const settings = loadWasiIoSettings();
        const secretKeyBase64 = currentAccount?.secretKeyBase64;
        const message = await runWasiIo(
          await WebAssembly.compile(wasm as unknown as BufferSource),
          {
            handle: browserWasiIoHandler(
              settings,
              currentAccount !== null && secretKeyBase64 !== undefined
                ? { ...currentAccount, secretKeyBase64 }
                : null,
            ),
            getPart: resolvePart,
            getSecret: loadSecret,
            onSecretUse: (use) => {
              recordSecretUse(use, `${part.moduleName}.${currentName}`);
            },
            onStep: (step) => {
              setWasiIoSteps((steps) => [...steps, step]);
            },
          },
        );
        setWasiIoMessage(message);
      }
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  }, [
    currentExpression,
    parts,
    partsByIdHash,
    workingChanges,
    partNames,
    language,
    currentAccount,
    part.moduleName,
    currentName,
  ]);

  function formatWasiIoStep(step: WasiIoStep): string {
    switch (step.kind) {
      case "get_parts":
        return `get_parts: ${step.found} 個${step.missing.length > 0 ? ` (見つからない: ${step.missing.join(", ")})` : ""}`;
      case "outgoing_request":
        return `${step.method} ${step.url} (${step.bodyBytes} bytes${step.secrets.length > 0 ? `, シークレット: ${step.secrets.join(", ")}` : ""}) → ${"error" in step.result ? `エラー: ${step.result.error}` : step.result.status}`;
    }
  }

  function formatValue(v: DefinyValue): string {
    if (v === null) return "null";
    if (typeof v === "object") {
      return JSON.stringify(v, null, 2);
    }
    return String(v);
  }

  return (
    <div className="part-detail-view">
      <div className="part-header card">
        <div className="breadcrumb">
          <Link href="/modules" className="breadcrumb-link">
            {part.moduleName}
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentName}</span>
          {hasChange && (
            <span
              className="badge badge-warning"
              style={{
                marginLeft: "0.4rem",
                background: "var(--yellow-bg-strong)",
                color: "var(--yellow)",
                border: "1px solid var(--yellow-border)",
              }}
            >
              ● {label(language, "Modified", "編集中の変更あり", "Modifita")}
            </span>
          )}
        </div>

        <div
          className="part-actions"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={history.past.length === 0}
            title={label(
              language,
              "Undo (Ctrl+Z)",
              "元に戻す (Ctrl+Z)",
              "Malfari (Ctrl+Z)",
            )}
            aria-label={label(language, "Undo", "元に戻す", "Malfari")}
            onClick={() => {
              handleUndoKey("undo");
            }}
          >
            <UndoIcon size={14} className="btn-icon" />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={history.future.length === 0}
            title={label(
              language,
              "Redo (Ctrl+Shift+Z)",
              "やり直す (Ctrl+Shift+Z)",
              "Refari (Ctrl+Shift+Z)",
            )}
            aria-label={label(language, "Redo", "やり直す", "Refari")}
            onClick={() => {
              handleUndoKey("redo");
            }}
          >
            <RedoIcon size={14} className="btn-icon" />
          </button>
          {hasChange && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                changePart(undefined, null);
              }}
            >
              {label(
                language,
                "Discard Changes",
                "変更を破棄",
                "Malfari ŝanĝojn",
              )}
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleEvaluate}
            disabled={evaluating}
          >
            <PlayIcon size={14} className="btn-icon" />
            {evaluating
              ? label(language, "Evaluating...", "評価中...", "Taksante...")
              : label(
                  language,
                  "Evaluate Expression",
                  "式を評価 (Wasm)",
                  "Taksi esprimon",
                )}
          </button>
        </div>
      </div>

      {evalResult !== null && (
        <div className="card eval-result-card success">
          <div className="eval-result-header">
            <span className="badge badge-success">
              {label(language, "Evaluation Result", "評価結果", "Rezulto")}
            </span>
          </div>
          <pre className="eval-result-pre">{formatValue(evalResult)}</pre>
        </div>
      )}

      {(wasiIoSteps.length > 0 || wasiIoMessage !== null) && (
        <div className="card eval-result-card success">
          <div className="eval-result-header">
            <span className="badge badge-success">
              {label(language, "I/O (wasi.io)", "I/O の実行 (wasi.io)", "I/O")}
            </span>
          </div>
          <pre className="eval-result-pre">
            {[
              ...wasiIoSteps.map(formatWasiIoStep),
              ...(wasiIoMessage === null ? ["..."] : [wasiIoMessage]),
            ].join("\n")}
          </pre>
        </div>
      )}

      {evalError !== null && (
        <div className="card eval-result-card error">
          <div className="eval-result-header">
            <span className="badge badge-error">
              {label(language, "Evaluation Error", "評価エラー", "Eraro")}
            </span>
          </div>
          <pre className="eval-result-pre">{evalError}</pre>
        </div>
      )}

      {secret !== null && (
        <SecretPanel
          key={secret.id}
          language={language}
          secret={secret}
          usages={findSecretUsages(
            parts,
            { partId: part.partId, partIdHash },
            secret.id,
          )}
          onChange={(next) => {
            editPart({ expression: { Secret: next } }, "secret");
          }}
        />
      )}

      <PartDefinitionTree
        name={currentName}
        moduleName={part.moduleName}
        description={localizedText(currentDescription, language)}
        partType={currentPartType}
        expression={currentExpression}
        editable={true}
        typeError={typeError}
        onNameChange={(newName) => {
          editPart({ name: newName }, "name");
        }}
        onDescriptionChange={(newDesc) => {
          editPart(
            {
              description: withLocalizedText(
                currentDescription,
                language,
                newDesc,
              ),
            },
            "description",
          );
        }}
        onPartTypeChange={(newPartType) => {
          editPart({ partType: newPartType }, null);
        }}
        onExpressionChange={(newExpr, newPartType, mergeKey) => {
          editPart(
            newPartType === undefined
              ? { expression: newExpr }
              : { expression: newExpr, partType: newPartType },
            mergeKey ?? null,
          );
        }}
      />
    </div>
  );
}

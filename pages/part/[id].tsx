import { useState, useCallback, useEffect, type JSX } from "react";
import { useParams, Link } from "@void/react";
import { PlayIcon } from "../../src/icons.tsx";
import { label, localizedText, withLocalizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import {
  collectReferencedParts,
  evaluateCompiledWasm,
  type DefinyValue,
} from "../../src/stage1_compiler.ts";
import { loadStage1Compiler } from "../../src/stage1_browser.ts";
import { PartDefinitionTree } from "../../src/tree_layout/PartDefinitionTree.tsx";
import type { ExpressionTypeError } from "../../src/tree_layout/ExpressionTreeEditor.tsx";

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
  } = useDefiny();

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<DefinyValue | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [_compiledWasm, setCompiledWasm] = useState<Uint8Array | null>(null);

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
  const currentDescription = change?.description ?? part.description;
  // 作業中の変更の型 (null は型指定なし) を優先する
  const currentPartType =
    change !== undefined ? change.partType : part.partType;
  const currentExpression =
    change?.expression !== undefined ? change.expression : part.expression;

  // 編集中の式を, 編集が 500ms 止まってから definy 製の型チェッカーで検査し (コミット済みの型環境を使う),
  // 型エラーはエラーのある式の横に出す. 検査できない式 (未入力・コンパイラ組み込み) には何も出さない.
  // 検査した後に式を編集したら, 検査し直すまで出さない (エラーの式が見つからずルートに出てしまうため)
  const partIdHash = "partIdHash" in part ? (part.partIdHash ?? null) : null;
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
    try {
      const compiler = await loadStage1Compiler();

      // 式が参照するパーツ (作業中の変更があればそちら) を集めて stage1 に渡す
      const { parts: referencedParts, unresolved } = collectReferencedParts(
        currentExpression,
        (partIdHash) => {
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
  ]);

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
          {hasChange && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                discardWorkingPart(part.partId);
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

      <PartDefinitionTree
        name={currentName}
        moduleName={part.moduleName}
        description={localizedText(currentDescription, language)}
        partType={currentPartType}
        expression={currentExpression}
        editable={true}
        typeError={typeError}
        onNameChange={(newName) => {
          updateWorkingPart(part.partId, {
            moduleDefinitionEventHash: part.moduleId,
            partDefinitionEventHash: part.partId,
            name: newName,
            description: currentDescription,
            partType: currentPartType,
            expression: currentExpression,
          });
        }}
        onDescriptionChange={(newDesc) => {
          updateWorkingPart(part.partId, {
            moduleDefinitionEventHash: part.moduleId,
            partDefinitionEventHash: part.partId,
            name: currentName,
            description: withLocalizedText(
              currentDescription,
              language,
              newDesc,
            ),
            partType: currentPartType,
            expression: currentExpression,
          });
        }}
        onPartTypeChange={(newPartType) => {
          updateWorkingPart(part.partId, {
            moduleDefinitionEventHash: part.moduleId,
            partDefinitionEventHash: part.partId,
            name: currentName,
            description: currentDescription,
            partType: newPartType,
            expression: currentExpression,
          });
        }}
        onExpressionChange={(newExpr) => {
          updateWorkingPart(part.partId, {
            moduleDefinitionEventHash: part.moduleId,
            partDefinitionEventHash: part.partId,
            name: currentName,
            description: currentDescription,
            partType: currentPartType,
            expression: newExpr,
          });
        }}
      />
    </div>
  );
}

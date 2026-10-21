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

export default function PartDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
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
  const [compiledWasm, setCompiledWasm] = useState<Uint8Array | null>(null);

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

  // 編集中の式を, 編集が 500ms 止まってから definy 製の型チェッカーで検査する (コミット済みの型環境を使う)
  const partIdHash = "partIdHash" in part ? (part.partIdHash ?? null) : null;
  const [typeCheck, setTypeCheck] = useState<
    | { readonly status: "checking" }
    | { readonly status: "ok" }
    | { readonly status: "error"; readonly message: string }
    | { readonly status: "unsupported"; readonly message: string }
  >({ status: "checking" });
  useEffect(() => {
    let cancelled = false;
    setTypeCheck({ status: "checking" });
    const timer = setTimeout(() => {
      checkPartType({
        partIdHash,
        partType: currentPartType,
        expression: currentExpression,
      }).then(
        (outcome) => {
          if (cancelled) return;
          if (outcome.kind === "ok") {
            setTypeCheck({ status: "ok" });
          } else if (outcome.kind === "unsupported") {
            setTypeCheck({ status: "unsupported", message: outcome.message });
          } else {
            setTypeCheck({
              status: "error",
              message: typeCheckMessage(currentName, outcome) ?? "",
            });
          }
        },
        (e: unknown) => {
          if (!cancelled) {
            setTypeCheck({
              status: "error",
              message: e instanceof Error ? e.message : String(e),
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
    currentName,
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

      <div
        className={`card part-type-check part-type-check-${typeCheck.status}`}
        aria-live="polite"
      >
        <span className="part-type-check-result">
          {typeCheck.status === "checking" &&
            label(language, "Checking...", "検査中...", "Kontrolante...")}
          {typeCheck.status === "ok" &&
            label(
              language,
              "No type errors",
              "型エラーはありません",
              "Neniuj tiperaroj",
            )}
          {typeCheck.status === "unsupported" &&
            `${label(
              language,
              "Cannot be checked",
              "検査できません",
              "Ne kontroleblas",
            )}: ${typeCheck.message}`}
          {typeCheck.status === "error" && typeCheck.message}
        </span>
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

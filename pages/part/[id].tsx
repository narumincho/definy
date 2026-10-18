import { useState, useCallback, type JSX } from "react";
import { useParams, Link } from "@void/react";
import { Icon } from "../../src/icons.tsx";
import { label, localizedText, withLocalizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import {
  evaluateCompiledWasm,
  loadStage1Compiler,
  type DefinyValue,
} from "../../src/stage1_compiler.ts";
import { PartDefinitionTree } from "../../src/tree_layout/PartDefinitionTree.tsx";

export default function PartDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const {
    language,
    parts,
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
  } = useDefiny();

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<DefinyValue | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [compiledWasm, setCompiledWasm] = useState<Uint8Array | null>(null);
  const [activeTab, setActiveTab] = useState<"tree" | "wasm" | "ast">("tree");

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
  const currentExpression =
    change?.expression !== undefined ? change.expression : part.expression;

  const handleEvaluate = useCallback(async () => {
    setEvaluating(true);
    setEvalError(null);
    try {
      const compiler = await loadStage1Compiler();

      const wasm = compiler.compile(currentExpression);
      setCompiledWasm(wasm);

      const result = await evaluateCompiledWasm(wasm);
      setEvalResult(result);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  }, [currentExpression]);

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
            <Icon kind="play" size={14} className="btn-icon" />
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

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "tree" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("tree");
          }}
        >
          {label(
            language,
            "Expression Tree Editor",
            "式の木構造エディタ",
            "Arba Redaktilo",
          )}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "wasm" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("wasm");
          }}
        >
          {label(language, "WebAssembly", "WebAssembly 出力", "WebAssembly")}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "ast" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("ast");
          }}
        >
          {label(language, "AST JSON", "構文木 JSON", "AST JSON")}
        </button>
      </div>

      <div className="tab-content card">
        {activeTab === "tree" && (
          <div className="tab-panel">
            <PartDefinitionTree
              name={currentName}
              moduleName={part.moduleName}
              description={localizedText(currentDescription, language)}
              partType={part.partType}
              expression={currentExpression}
              editable={true}
              onNameChange={(newName) => {
                updateWorkingPart(part.partId, {
                  moduleDefinitionEventHash: part.moduleId,
                  partDefinitionEventHash: part.partId,
                  name: newName,
                  description: currentDescription,
                  partType: part.partType,
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
                  partType: part.partType,
                  expression: currentExpression,
                });
              }}
              onExpressionChange={(newExpr) => {
                updateWorkingPart(part.partId, {
                  moduleDefinitionEventHash: part.moduleId,
                  partDefinitionEventHash: part.partId,
                  name: currentName,
                  description: currentDescription,
                  partType: part.partType,
                  expression: newExpr,
                });
              }}
            />
          </div>
        )}

        {activeTab === "wasm" && (
          <div className="tab-panel">
            {compiledWasm ? (
              <div>
                <p>
                  {label(
                    language,
                    "Compiled Wasm Size:",
                    "コンパイル後 Wasm サイズ:",
                    "Grandeco:",
                  )}{" "}
                  <strong>{compiledWasm.byteLength} bytes</strong>
                </p>
                <div className="wasm-hex-preview">
                  <pre>
                    {Array.from(compiledWasm.slice(0, 128))
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join(" ")}
                    {compiledWasm.byteLength > 128 ? " ..." : ""}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-muted">
                {label(
                  language,
                  "Click 'Evaluate Expression' above to compile this part with stage1.wasm.",
                  "上の「式を評価」ボタンを押すと stage1.wasm でコンパイルされます。",
                  "Alklaku 'Taksi esprimon' por kompili.",
                )}
              </p>
            )}
          </div>
        )}

        {activeTab === "ast" && (
          <div className="tab-panel">
            <pre className="code-block">
              {JSON.stringify(currentExpression, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

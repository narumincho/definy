import { useState, useCallback, type JSX } from "react";
import { useParams, Link } from "@void/react";
import { Icon } from "../../src/icons.tsx";
import { label } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import {
  createStage1Compiler,
  evaluateCompiledWasm,
  type DefinyValue,
} from "../../src/stage1_compiler.ts";

export default function PartDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, parts, workingChanges } = useDefiny();

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<DefinyValue | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [compiledWasm, setCompiledWasm] = useState<Uint8Array | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "wasm" | "ast">(
    "overview",
  );

  const part = parts.find(
    (p) =>
      p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id,
  ) ?? {
    partId: id ?? "unknown",
    moduleId: "core",
    moduleName: "core",
    name: id ? id.slice(0, 16) : "unknown",
    description: "Sample part",
    partType: null,
    expression: {
      Variant: {
        tag: "add",
        payload: {
          TypeLiteral: {
            items: [
              {
                key: "left",
                value: {
                  Variant: {
                    tag: "number",
                    payload: { Number: { value: 15 } },
                  },
                },
              },
              {
                key: "right",
                value: {
                  Variant: {
                    tag: "number",
                    payload: { Number: { value: 27 } },
                  },
                },
              },
            ],
          },
        },
      },
    },
    updatedAtMs: Date.now(),
  };

  const handleEvaluate = useCallback(async () => {
    setEvaluating(true);
    setEvalError(null);
    try {
      // In browser, fetch stage1.wasm and compile
      const res = await fetch("/virtual/wasm/stage1.wasm");
      if (!res.ok) {
        throw new Error(`Failed to load stage1.wasm: ${res.status}`);
      }
      const stage1Bytes = await res.arrayBuffer();
      const stage1Mod = await WebAssembly.compile(stage1Bytes);
      const compiler = createStage1Compiler(stage1Mod);

      const wasm = compiler.compile(part.expression);
      setCompiledWasm(wasm);

      const result = await evaluateCompiledWasm(wasm);
      setEvalResult(result);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  }, [part.expression]);

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
          <span className="breadcrumb-current">{part.name}</span>
          {workingChanges.parts.has(part.partId) && (
            <span className="badge badge-warning">● Modified</span>
          )}
        </div>

        <div className="part-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleEvaluate}
            disabled={evaluating}
          >
            <Icon kind="play" className="btn-icon" />
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
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("overview");
          }}
        >
          {label(language, "Overview", "概要", "Superrigardo")}
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
        {activeTab === "overview" && (
          <div className="tab-panel">
            <h3>{label(language, "Description", "説明", "Priskribo")}</h3>
            <p className="part-desc-text">
              {part.description ||
                label(
                  language,
                  "No description",
                  "説明なし",
                  "Neniu priskribo",
                )}
            </p>
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
              {JSON.stringify(part.expression, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

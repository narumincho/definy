import { useState, type JSX } from "react";
import { ExpressionTreeEditor } from "./ExpressionTreeEditor.tsx";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";

export interface PartDefinitionTreeProps {
  readonly name: string;
  readonly moduleName: string;
  readonly description: string;
  readonly partType: unknown;
  readonly expression: unknown;
  readonly editable?: boolean;
  readonly onNameChange?: (name: string) => void;
  readonly onDescriptionChange?: (desc: string) => void;
  readonly onExpressionChange?: (expr: unknown) => void;
}

export function PartDefinitionTree({
  name,
  moduleName,
  description,
  partType,
  expression,
  editable = true,
  onNameChange,
  onDescriptionChange,
  onExpressionChange,
}: PartDefinitionTreeProps): JSX.Element {
  const { language } = useDefiny();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  function formatType(t: unknown): string {
    if (!t) return "unknown";
    if (typeof t === "string") return t;
    if (typeof t === "object") {
      const keys = Object.keys(t);
      if (keys.length === 1 && keys[0]) return keys[0];
      return JSON.stringify(t);
    }
    return String(t);
  }

  return (
    <div
      id="part-definition-tree"
      className="part-definition-tree"
      tabIndex={0}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      {/* 1. Header Row (part <name>) */}
      <div
        className="def-row def-head"
        data-state={selectedRow === "name" ? "selected" : ""}
        onClick={() => {
          setSelectedRow("name");
        }}
      >
        <span className="def-keyword">part</span>
        {editable ? (
          <input
            type="text"
            className="def-input def-name-input"
            value={name}
            placeholder={label(language, "Part name", "パーツ名", "Nomo")}
            onChange={(e) => {
              onNameChange?.(e.target.value);
            }}
          />
        ) : (
          <span
            className="def-name-input"
            style={{ padding: "0.18rem 0.4rem" }}
          >
            {name}
          </span>
        )}
      </div>

      {/* 2. Indented Children Rows */}
      <div className="def-children">
        {/* Module row */}
        <div
          className="def-row"
          data-state={selectedRow === "module" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("module");
          }}
        >
          <span className="def-label">module</span>
          <span
            className="def-value"
            style={{
              paddingTop: "0.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
            }}
          >
            {moduleName}
          </span>
        </div>

        {/* Documentation / Description row */}
        <div
          className="def-row"
          data-state={selectedRow === "description" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("description");
          }}
        >
          <span className="def-label">doc</span>
          {editable ? (
            <textarea
              className="def-input def-description-input"
              value={description}
              placeholder={label(
                language,
                "Description for this part...",
                "このパーツの説明...",
                "Priskribo de la parto...",
              )}
              rows={1}
              onChange={(e) => {
                onDescriptionChange?.(e.target.value);
              }}
            />
          ) : (
            <span className="def-value" style={{ paddingTop: "0.25rem" }}>
              {description ||
                label(
                  language,
                  "(No description)",
                  "(説明なし)",
                  "(Neniu priskribo)",
                )}
            </span>
          )}
        </div>

        {/* Type row */}
        <div
          className="def-row"
          data-state={selectedRow === "type" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("type");
          }}
        >
          <span className="def-label">type</span>
          <span className="def-value" style={{ paddingTop: "0.2rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.1rem 0.45rem",
                borderRadius: "var(--radius-full)",
                background: "var(--overlay-3)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                color: "var(--text)",
              }}
            >
              {formatType(partType)}
            </span>
          </span>
        </div>

        {/* Value (Expression Tree) row */}
        <div
          className="def-row def-row-tree"
          data-state={selectedRow === "value" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("value");
          }}
        >
          <span className="def-label">value</span>
          <div className="def-value">
            <ExpressionTreeEditor
              expression={expression}
              onChange={onExpressionChange}
              editable={editable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

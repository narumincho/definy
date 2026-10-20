import { useState, useRef, type JSX, type KeyboardEvent } from "react";
import { ExpressionTreeEditor } from "./ExpressionTreeEditor.tsx";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";
import { navKeyFromEvent, type NavKey } from "./keyboard.ts";
import { nextRow, type DefinitionRow } from "./definition_rows.ts";

const VALUE_TREE_ID = "part-def-value-tree";

function rowElementId(row: DefinitionRow): string {
  return `part-def-${row}`;
}

export type PartDefinitionTreeProps = {
  readonly name: string;
  readonly moduleName: string;
  readonly description: string;
  readonly partType: unknown;
  readonly expression: unknown;
  readonly editable?: boolean | undefined;
  readonly onNameChange?: ((name: string) => void) | undefined;
  readonly onDescriptionChange?: ((desc: string) => void) | undefined;
  readonly onExpressionChange?: ((expr: unknown) => void) | undefined;
};

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
  const [selectedRow, setSelectedRow] = useState<DefinitionRow | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  function selectRow(row: DefinitionRow): void {
    setSelectedRow(row);
    document
      .getElementById(rowElementId(row))
      ?.scrollIntoView({ block: "nearest" });
  }

  /** 入力欄・式のツリーからこのツリーへ戻る */
  function returnToRow(row: DefinitionRow): void {
    setSelectedRow(row);
    treeRef.current?.focus({ preventScroll: true });
  }

  /** 式のツリーへフォーカスを移す (ツリー側でルートが選ばれる) */
  function enterValueTree(): void {
    document.getElementById(VALUE_TREE_ID)?.focus();
  }

  /** 行の中身を編集する (Enter). 式はツリーの中へ入る */
  function editRow(row: DefinitionRow): void {
    const element = document.getElementById(rowElementId(row));
    if (row === "value") {
      enterValueTree();
    } else {
      element?.querySelector<HTMLElement>("input, textarea")?.focus();
    }
  }

  // docs/key.md のキー操作. 子の式のツリーで処理されたキーはここまで来ない (stopPropagation)
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.target !== e.currentTarget) {
      // 名前・説明の入力欄では Escape (名前は Enter も) でツリーに戻る
      if (
        (selectedRow === "name" || selectedRow === "description") &&
        (e.key === "Escape" || (e.key === "Enter" && selectedRow === "name"))
      ) {
        e.preventDefault();
        returnToRow(selectedRow);
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedRow === null) {
        selectRow("name");
      } else {
        editRow(selectedRow);
      }
      return;
    }
    if (e.key === "Escape") {
      setSelectedRow(null);
      return;
    }
    const navKey = navKeyFromEvent(e);
    if (navKey === null) return;
    e.preventDefault();
    // 式の行で E を押したらそのツリーの中へ入る
    if (
      selectedRow === "value" &&
      (navKey === "firstChild" || navKey === "lastChild")
    ) {
      enterValueTree();
      return;
    }
    const next = nextRow(selectedRow, navKey);
    if (next !== null) {
      selectRow(next);
    }
  }

  /** 式のツリーの上端・下端から抜けたら隣の行へ, ルートで Q ならその行へ戻る */
  function handleExitValueTree(key: NavKey): void {
    returnToRow(
      key === "up" || key === "down"
        ? (nextRow("value", key) ?? "value")
        : "value",
    );
  }

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
      ref={treeRef}
      id="part-definition-tree"
      className="part-definition-tree"
      tabIndex={0}
      role="tree"
      aria-label={label(
        language,
        "Part definition (W/S to move, E to enter value, Enter to edit)",
        "パーツ定義 (W/S で移動, E で式の中へ, Enter で編集)",
        "Parto-difino (W/S por movi, E por eniri, Enter por redakti)",
      )}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        // 式のツリーから戻ってきたときは, 同じイベント処理の中で選んだ行を上書きしない
        if (e.target === e.currentTarget) {
          setSelectedRow((prev) => prev ?? "name");
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      {/* 1. Header Row (part <name>) */}
      <div
        className="def-row def-head"
        id={rowElementId("name")}
        role="treeitem"
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
            onFocus={() => {
              setSelectedRow("name");
            }}
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
          id={rowElementId("module")}
          role="treeitem"
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
          id={rowElementId("description")}
          role="treeitem"
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
              onFocus={() => {
                setSelectedRow("description");
              }}
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
          id={rowElementId("type")}
          role="treeitem"
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
          id={rowElementId("value")}
          role="treeitem"
          data-state={selectedRow === "value" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("value");
          }}
        >
          <span className="def-label">value</span>
          <div className="def-value">
            <ExpressionTreeEditor
              expression={expression}
              partType={partType}
              onChange={onExpressionChange}
              editable={editable}
              containerId={VALUE_TREE_ID}
              onExit={handleExitValueTree}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

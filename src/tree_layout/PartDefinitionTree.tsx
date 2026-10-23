import { useState, useRef, useMemo, type JSX, type KeyboardEvent } from "react";
import {
  ExpressionTreeEditor,
  type ExpressionTypeError,
} from "./ExpressionTreeEditor.tsx";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";
import { navKeyFromEvent, type NavKey } from "./keyboard.ts";
import { nextRow, type DefinitionRow } from "./definition_rows.ts";
import {
  expressionToPartType,
  partTypeToExpression,
  syncPartTypeParameterNames,
} from "./part_type.ts";

/** 中に型・式のツリーエディタを持つ行と, そのツリーの枠の ID */
const INNER_TREE_IDS = {
  type: "part-def-type-tree",
  value: "part-def-value-tree",
} as const;

function rowElementId(row: DefinitionRow): string {
  return `part-def-${row}`;
}

export type PartDefinitionTreeProps = {
  readonly name: string;
  readonly moduleName: string;
  readonly description: string;
  readonly partType: unknown;
  readonly expression: unknown;
  readonly editable?: boolean;
  readonly onNameChange?: (name: string) => void;
  readonly onDescriptionChange?: (desc: string) => void;
  /**
   * 式を変えたとき. 式の根の関数の引数名を変えたときは, パーツの型の同じ位置の引数名も合わせて
   * `partType` に渡す (変えていなければ `undefined`)
   */
  readonly onExpressionChange?: (expr: unknown, partType?: unknown) => void;
  /** 型を変えたとき. `null` は型指定なし */
  readonly onPartTypeChange?: (partType: unknown) => void;
  /** 式の型エラー. エラーのある式の横に警告を出す */
  readonly typeError?: ExpressionTypeError | null;
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
  onPartTypeChange,
  typeError = null,
}: PartDefinitionTreeProps): JSX.Element {
  const { language } = useDefiny();
  const [selectedRow, setSelectedRow] = useState<DefinitionRow | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  // 型は旧 Rust 版と同じく型の式にして式のツリーエディタで編集する (part_type.ts)
  const typeExpression = useMemo(
    () => partTypeToExpression(partType),
    [partType],
  );

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

  /** 型・式のツリーへフォーカスを移す (ツリー側でルートが選ばれる) */
  function enterInnerTree(row: DefinitionRow): boolean {
    if (row !== "type" && row !== "value") return false;
    const treeId = INNER_TREE_IDS[row];
    document.getElementById(treeId)?.focus();
    return true;
  }

  /** 行の中身を編集する (Enter). 型・式はツリーの中へ入る */
  function editRow(row: DefinitionRow): void {
    const element = document.getElementById(rowElementId(row));
    if (!enterInnerTree(row)) {
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
    // 型・式の行で E を押したらそのツリーの中へ入る
    if (
      selectedRow !== null &&
      (navKey === "firstChild" || navKey === "lastChild") &&
      enterInnerTree(selectedRow)
    ) {
      return;
    }
    const next = nextRow(selectedRow, navKey);
    if (next !== null) {
      selectRow(next);
    }
  }

  /** 型・式のツリーの上端・下端から抜けたら隣の行へ, ルートで Q ならその行へ戻る */
  function exitInnerTree(row: DefinitionRow): (key: NavKey) => void {
    return (key) => {
      returnToRow(
        key === "up" || key === "down" ? (nextRow(row, key) ?? row) : row,
      );
    };
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
          className="def-row def-row-tree"
          id={rowElementId("type")}
          role="treeitem"
          data-state={selectedRow === "type" ? "selected" : ""}
          onClick={() => {
            setSelectedRow("type");
          }}
        >
          <span className="def-label">type</span>
          <div className="def-value">
            <ExpressionTreeEditor
              mode="type"
              expression={typeExpression}
              {...(onPartTypeChange
                ? {
                    onChange: (next) => {
                      onPartTypeChange(expressionToPartType(next));
                    },
                  }
                : {})}
              {...(editable !== undefined ? { editable } : {})}
              containerId={INNER_TREE_IDS.type}
              onExit={exitInnerTree("type")}
            />
          </div>
          {editable && onPartTypeChange && partType != null && (
            <button
              type="button"
              className="def-row-action"
              title={label(
                language,
                "Clear (no type)",
                "型指定をなくす",
                "Forigi tipon",
              )}
              aria-label={label(
                language,
                "Clear (no type)",
                "型指定をなくす",
                "Forigi tipon",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onPartTypeChange(null);
              }}
            >
              ×
            </button>
          )}
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
              {...(partType !== undefined ? { partType } : {})}
              {...(onExpressionChange !== undefined
                ? {
                    onChange: (next: unknown) => {
                      onExpressionChange(
                        next,
                        syncPartTypeParameterNames(partType, expression, next),
                      );
                    },
                  }
                : {})}
              {...(editable !== undefined ? { editable } : {})}
              containerId={INNER_TREE_IDS.value}
              onExit={exitInnerTree("value")}
              typeError={typeError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

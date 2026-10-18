import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type JSX,
  type KeyboardEvent,
} from "react";
import { computeLayout, expressionToLayoutNode } from "./engine.ts";
import {
  applySelection,
  clearExpressionAtPath,
  setNumberValue,
  setStringValue,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { isSamePath, type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";

export interface ExpressionTreeEditorProps {
  readonly expression: unknown;
  readonly onChange?: (newExpression: unknown) => void;
  readonly editable?: boolean;
  readonly maxWidth?: number;
}

interface SelectorOption {
  readonly value: string;
  readonly label: string;
  readonly category: string;
}

export function ExpressionTreeEditor({
  expression,
  onChange,
  editable = true,
  maxWidth = 720,
}: ExpressionTreeEditorProps): JSX.Element {
  const { language, parts } = useDefiny();
  const [selectedPath, setSelectedPath] =
    useState<ReadonlyArray<PathStep> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const partNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parts) {
      map.set(p.partId, `${p.moduleName}.${p.name}`);
      if (p.contentHash) {
        map.set(p.contentHash, `${p.moduleName}.${p.name}`);
      }
    }
    return map;
  }, [parts]);

  const layoutRoot = useMemo(() => {
    const rawTree = expressionToLayoutNode(expression, "root", { partNames });
    return computeLayout(rawTree, { maxWidth });
  }, [expression, partNames, maxWidth]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectNode = useCallback(
    (_id: string, path: ReadonlyArray<PathStep>) => {
      setSelectedPath((prev) => {
        if (prev && isSamePath(prev, path)) {
          // Toggle menu if clicking same node
          setIsMenuOpen((open) => !open);
          return prev;
        }
        setIsMenuOpen(true);
        setSearchQuery("");
        setHighlightedIndex(0);
        return path;
      });
    },
    [],
  );

  const handleChangeNumber = useCallback(
    (path: ReadonlyArray<PathStep>, value: number) => {
      if (!onChange) return;
      const updated = setNumberValue(expression, path, value);
      onChange(updated);
    },
    [expression, onChange],
  );

  const handleChangeString = useCallback(
    (path: ReadonlyArray<PathStep>, value: string) => {
      if (!onChange) return;
      const updated = setStringValue(expression, path, value);
      onChange(updated);
    },
    [expression, onChange],
  );

  const handleClear = useCallback(
    (path: ReadonlyArray<PathStep>) => {
      if (!onChange) return;
      const updated = clearExpressionAtPath(expression, path);
      onChange(updated);
    },
    [expression, onChange],
  );

  const selectorOptions = useMemo<ReadonlyArray<SelectorOption>>(() => {
    const list: SelectorOption[] = [
      { value: "expr:number", label: "0 (Number)", category: "Literals" },
      { value: "expr:string", label: '"" (String)', category: "Literals" },
      {
        value: "expr:boolean:true",
        label: "true (Boolean)",
        category: "Literals",
      },
      {
        value: "expr:boolean:false",
        label: "false (Boolean)",
        category: "Literals",
      },
      { value: "expr:list", label: "[] (List)", category: "Literals" },
      { value: "expr:add", label: "plus (+)", category: "Operators" },
      { value: "expr:subtract", label: "minus (-)", category: "Operators" },
      { value: "expr:multiply", label: "multiply (*)", category: "Operators" },
      { value: "expr:divide", label: "divide (/)", category: "Operators" },
      {
        value: "expr:remainder",
        label: "remainder (%)",
        category: "Operators",
      },
      { value: "expr:equal", label: "equal (==)", category: "Operators" },
      {
        value: "expr:not_equal",
        label: "not-equal (!=)",
        category: "Operators",
      },
      {
        value: "expr:less_than",
        label: "less-than (<)",
        category: "Operators",
      },
      {
        value: "expr:greater_than",
        label: "greater-than (>)",
        category: "Operators",
      },
      { value: "expr:and", label: "and (&&)", category: "Operators" },
      { value: "expr:or", label: "or (||)", category: "Operators" },
      { value: "expr:not", label: "not (!)", category: "Operators" },
      {
        value: "expr:string_concat",
        label: "string-concat",
        category: "Operators",
      },
      { value: "expr:if", label: "if (cond, then, else)", category: "Control" },
      { value: "expr:hole", label: "□ (Hole / Clear)", category: "Control" },
    ];

    for (const p of parts) {
      list.push({
        value: `ref:part:${p.partId}`,
        label: `${p.moduleName}.${p.name}`,
        category: "Parts",
      });
    }

    return list;
  }, [parts]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return selectorOptions;
    return selectorOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.category.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [selectorOptions, searchQuery]);

  const applyOption = useCallback(
    (optionValue: string) => {
      if (!selectedPath || !onChange) return;
      const updated = applySelection(expression, selectedPath, optionValue);
      onChange(updated);
      setIsMenuOpen(false);
      setSearchQuery("");
    },
    [expression, selectedPath, onChange],
  );

  function handleContainerKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Escape") {
      setIsMenuOpen(false);
      return;
    }

    if (e.key === "Enter" && selectedPath && !isMenuOpen) {
      e.preventDefault();
      setIsMenuOpen(true);
      return;
    }

    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selectedPath &&
      !isMenuOpen &&
      editable
    ) {
      e.preventDefault();
      handleClear(selectedPath);
    }
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredOptions[highlightedIndex];
      if (selected) {
        applyOption(selected.value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsMenuOpen(false);
    }
  }

  useEffect(() => {
    if (isMenuOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMenuOpen]);

  return (
    <div
      ref={containerRef}
      className="expression-tree-container"
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        background: "var(--bg-canvas)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        outline: "none",
        minHeight: "80px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            {label(language, "Expression Tree", "式の木構造", "Esprima Arbo")}
          </span>
          {editable && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {label(
                language,
                "(Click node to edit / Replace with Del)",
                "(ノードをクリックして置換 / Del で未入力化)",
                "(Alklaku por redakti)",
              )}
            </span>
          )}
        </div>
        {selectedPath && editable && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIsMenuOpen((open) => !open);
            }}
          >
            {isMenuOpen
              ? label(
                  language,
                  "Close Menu",
                  "メニューを閉じる",
                  "Fermi menuon",
                )
              : label(
                  language,
                  "Change Node...",
                  "ノードを変更...",
                  "Ŝanĝi nodon...",
                )}
          </button>
        )}
      </div>

      <TreeLayoutRenderer
        node={layoutRoot}
        selectedPath={selectedPath}
        hoveredId={hoveredId}
        collapsedIds={collapsedIds}
        editable={editable}
        onSelectNode={handleSelectNode}
        onHoverNode={setHoveredId}
        onToggleCollapse={toggleCollapse}
        onChangeNumber={handleChangeNumber}
        onChangeString={handleChangeString}
        onClear={handleClear}
      />

      {/* Popover / Anchored Dropdown Panel for expression selection */}
      {isMenuOpen && editable && selectedPath && (
        <div
          className="dropdown-popover-panel"
          style={{
            position: "relative",
            zIndex: 100,
            marginTop: "0.5rem",
            padding: "0.5rem",
            background: "var(--surface-opaque)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            maxWidth: "26rem",
            maxHeight: "18rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={label(
                language,
                "Search expression or operator...",
                "式・演算子・パーツを検索...",
                "Serĉi esprimon...",
              )}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleMenuKeyDown}
              style={{
                width: "100%",
                padding: "0.25rem 0.5rem",
                fontSize: "0.82rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.25rem 0.5rem" }}
              title={label(language, "Clear to Hole", "未入力にする", "Vakigi")}
              onClick={() => {
                handleClear(selectedPath);
                setIsMenuOpen(false);
              }}
            >
              ⌫
            </button>
          </div>

          <div
            style={{
              overflowY: "auto",
              maxHeight: "13rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "0.5rem",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                }}
              >
                {label(
                  language,
                  "No matches",
                  "一致する候補がありません",
                  "Neniuj kongruoj",
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="dropdown-option"
                    data-state={isHighlighted ? "highlighted" : ""}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.82rem",
                      background: isHighlighted
                        ? "var(--overlay-3)"
                        : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--overlay-2)",
                      color: isHighlighted
                        ? "var(--text-primary)"
                        : "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => {
                      applyOption(opt.value);
                    }}
                    onMouseEnter={() => {
                      setHighlightedIndex(idx);
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {opt.label}
                    </span>
                    <span
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      {opt.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

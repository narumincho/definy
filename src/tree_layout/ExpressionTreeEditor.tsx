import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useId,
  type JSX,
  type KeyboardEvent,
} from "react";
import { computeLayout, expressionToLayoutNode } from "./engine.ts";
import {
  applySelection,
  clearExpressionAtPath,
  getExpressionAtPath,
  setNumberValue,
  setStringValue,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { isSamePath, type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";
import { base64ToBytes } from "../cbor.ts";
import {
  inferExpectedType,
  getOptionValueForExpression,
  type ExpectedType,
} from "./type_inference.ts";

export interface ExpressionTreeEditorProps {
  readonly expression: unknown;
  readonly partType?: unknown;
  readonly onChange?: (newExpression: unknown) => void;
  readonly editable?: boolean;
  readonly maxWidth?: number;
}

interface SelectorOption {
  readonly value: string;
  readonly label: string;
  readonly category: string;
  readonly returnType: ExpectedType;
}

/**
 * 置換メニューを選択中のノードの直下に出すのに必要な
 * CSS Anchor Positioning と Popover API に対応しているか.
 * 未対応なら従来どおり式全体の下に通常のフローで表示する
 */
function supportsAnchoredPopover(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof HTMLElement !== "undefined" &&
    CSS.supports("position-anchor", "--a") &&
    CSS.supports("position-area", "block-end") &&
    "showPopover" in HTMLElement.prototype
  );
}

/**
 * メニューを top layer に出す. エディタの `overflow` で切り取られないようにするため.
 * 検索欄へのフォーカス (useEffect) より前に表示されている必要があるので ref コールバックで行う
 */
function showAsPopover(element: HTMLDivElement | null): void {
  if (element !== null && !element.matches(":popover-open")) {
    element.showPopover();
  }
}

export function ExpressionTreeEditor({
  expression,
  partType,
  onChange,
  editable = true,
  maxWidth = 720,
}: ExpressionTreeEditorProps): JSX.Element {
  const { language, parts, partNames: contextPartNames } = useDefiny();
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
  const listRef = useRef<HTMLDivElement>(null);

  // useId の値は `:` などを含むので, CSS の dashed-ident に使える文字だけにする
  const selectionAnchorName = `--expression-selection-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const partNames = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>(contextPartNames);
    for (const p of parts) {
      const fullName = `${p.moduleName}.${p.name}`;
      map.set(p.partId, fullName);
      map.set(p.name, fullName);
      if (p.contentHash) {
        map.set(p.contentHash, fullName);
        try {
          const bytes = base64ToBytes(p.contentHash);
          map.set(String(Array.from(bytes)), fullName);
        } catch {
          // ignore
        }
      }
      if (p.partIdHash) {
        map.set(p.partIdHash, fullName);
        try {
          const bytes = base64ToBytes(p.partIdHash);
          map.set(String(Array.from(bytes)), fullName);
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [parts, contextPartNames]);

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
        return path;
      });
      requestAnimationFrame(() => {
        containerRef.current?.focus();
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

  /**
   * 式を未入力にし, すぐ別の式を選べるようにメニューを開いて検索欄にフォーカスする.
   * メニューが閉じていた場合は, 開いたあとの useEffect でフォーカスされる
   */
  const handleClear = useCallback(
    (path: ReadonlyArray<PathStep>) => {
      if (!onChange) return;
      const updated = clearExpressionAtPath(expression, path);
      onChange(updated);
      setSelectedPath(path);
      setIsMenuOpen(true);
      setSearchQuery("");
      searchInputRef.current?.focus();
    },
    [expression, onChange],
  );

  const expectedType = useMemo<ExpectedType>(() => {
    if (!selectedPath) return "any";
    return inferExpectedType(expression, selectedPath, partType);
  }, [expression, selectedPath, partType]);

  const currentOptionValue = useMemo<string | null>(() => {
    if (!selectedPath) return null;
    const currentSubExpr = getExpressionAtPath(expression, selectedPath);
    return getOptionValueForExpression(currentSubExpr, partNames);
  }, [expression, selectedPath, partNames]);

  const selectorOptions = useMemo<ReadonlyArray<SelectorOption>>(() => {
    const baseOptions: ReadonlyArray<SelectorOption> = [
      {
        value: "expr:number",
        label: "0 (Number)",
        category: "Literals",
        returnType: "number",
      },
      {
        value: "expr:string",
        label: '"" (String)',
        category: "Literals",
        returnType: "string",
      },
      {
        value: "expr:boolean:true",
        label: "true (Boolean)",
        category: "Literals",
        returnType: "boolean",
      },
      {
        value: "expr:boolean:false",
        label: "false (Boolean)",
        category: "Literals",
        returnType: "boolean",
      },
      {
        value: "expr:list",
        label: "[] (List)",
        category: "Literals",
        returnType: "list",
      },
      {
        value: "expr:add",
        label: "plus (+)",
        category: "Operators",
        returnType: "number",
      },
      {
        value: "expr:subtract",
        label: "minus (-)",
        category: "Operators",
        returnType: "number",
      },
      {
        value: "expr:multiply",
        label: "multiply (*)",
        category: "Operators",
        returnType: "number",
      },
      {
        value: "expr:divide",
        label: "divide (/)",
        category: "Operators",
        returnType: "number",
      },
      {
        value: "expr:remainder",
        label: "remainder (%)",
        category: "Operators",
        returnType: "number",
      },
      {
        value: "expr:equal",
        label: "equal (==)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:not_equal",
        label: "not-equal (!=)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:less_than",
        label: "less-than (<)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:greater_than",
        label: "greater-than (>)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:and",
        label: "and (&&)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:or",
        label: "or (||)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:not",
        label: "not (!)",
        category: "Operators",
        returnType: "boolean",
      },
      {
        value: "expr:string_concat",
        label: "string-concat",
        category: "Operators",
        returnType: "string",
      },
      {
        value: "expr:if",
        label: "if (cond, then, else)",
        category: "Control",
        returnType: "any",
      },
      {
        value: "expr:hole",
        label: "□ (Hole / Clear)",
        category: "Control",
        returnType: "any",
      },
    ];

    const partOptions: ReadonlyArray<SelectorOption> = parts.map((p) => {
      let rType: ExpectedType = "any";
      if (typeof p.partType === "string") {
        if (p.partType === "number") rType = "number";
        else if (p.partType === "string") rType = "string";
        else if (p.partType === "boolean") rType = "boolean";
        else if (p.partType === "list") rType = "list";
      } else if (typeof p.partType === "object" && p.partType !== null) {
        const obj = p.partType as Record<string, unknown>;
        if ("function" in obj) {
          const fn = obj.function as { return_type?: unknown };
          if (fn.return_type === "number") rType = "number";
          else if (fn.return_type === "string") rType = "string";
          else if (fn.return_type === "boolean") rType = "boolean";
        }
      }
      return {
        value: `ref:part:${p.partId}`,
        label: `${p.moduleName}.${p.name}`,
        category: "Parts",
        returnType: rType,
      };
    });

    return [...baseOptions, ...partOptions];
  }, [parts]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = !q
      ? selectorOptions
      : selectorOptions.filter(
          (opt) =>
            opt.label.toLowerCase().includes(q) ||
            opt.category.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q),
        );

    if (expectedType === "any") {
      return matched;
    }

    // 期待型に合う候補を先に並べる
    const primary = matched.filter(
      (opt) => opt.returnType === expectedType || opt.returnType === "any",
    );
    const secondary = matched.filter(
      (opt) => opt.returnType !== expectedType && opt.returnType !== "any",
    );
    return [...primary, ...secondary];
  }, [selectorOptions, searchQuery, expectedType]);

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
      containerRef.current?.focus();
      return;
    }

    // 検索欄やリテラル等の入力欄のキー操作は、それぞれの入力要素で処理する
    const isTextInput =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement;
    if (isTextInput) {
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
      containerRef.current?.focus();
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      e.currentTarget.value.length === 0 &&
      selectedPath
    ) {
      // 検索欄が空のときだけ選択中の式を未入力にする. 文字が残っている間は通常どおり文字を消す
      e.preventDefault();
      handleClear(selectedPath);
    }
  }

  // ノード選択中のキーボード操作 (Escape で閉じる, Backspace / Delete で未入力化)
  useEffect(() => {
    function onGlobalKeyDown(e: globalThis.KeyboardEvent): void {
      if (e.key === "Escape" && isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(false);
        containerRef.current?.focus();
        return;
      }

      if (!selectedPath || !editable) return;
      const target = e.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isInput) {
        // コンテナの外側にある input（パーツ名入力欄やヘッダーなど）の場合は触らない
        if (
          containerRef.current &&
          !containerRef.current.contains(target as Node)
        ) {
          return;
        }
        // 検索欄やインライン入力欄の場合、文字が残っていれば通常の文字削除を優先する
        if (
          target instanceof HTMLInputElement &&
          target.value.length > 0 &&
          e.key === "Backspace"
        ) {
          return;
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleClear(selectedPath);
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
    };
  }, [selectedPath, editable, isMenuOpen, handleClear]);

  // メニューを開いたときに現在の値の候補までスクロールし、ハイライトを合わせる
  useEffect(() => {
    if (!isMenuOpen) return;
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (currentOptionValue) {
      const idx = filteredOptions.findIndex(
        (opt) => opt.value === currentOptionValue,
      );
      if (idx >= 0) {
        setHighlightedIndex(idx);
        requestAnimationFrame(() => {
          const list = listRef.current;
          if (!list) return;
          const targetEl = list.children[idx] as HTMLElement | undefined;
          targetEl?.scrollIntoView({ block: "center", behavior: "auto" });
        });
        return;
      }
    }
    setHighlightedIndex(0);
  }, [isMenuOpen, currentOptionValue, filteredOptions]);

  // キー操作でハイライトが移動したときに追従スクロールする
  useEffect(() => {
    if (!isMenuOpen) return;
    const list = listRef.current;
    if (!list) return;
    const targetEl = list.children[highlightedIndex] as HTMLElement | undefined;
    targetEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedIndex, isMenuOpen]);

  // メニューはユーザー操作で開くので, 判定はブラウザ上でのみ行われる
  const anchoredMenu = isMenuOpen && supportsAnchoredPopover();

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
                "(Click node to edit / Del to clear)",
                "(ノードをクリックして置換 / Del または Backspace で未入力化)",
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
        selectionAnchorName={selectionAnchorName}
      />

      {/*
       * 式の置換メニュー. 対応ブラウザでは popover (top layer) にして,
       * CSS Anchor Positioning で選択中のノードのすぐ下に表示する
       */}
      {isMenuOpen && editable && selectedPath && (
        <div
          ref={anchoredMenu ? showAsPopover : undefined}
          popover={anchoredMenu ? "manual" : undefined}
          className={
            anchoredMenu
              ? "dropdown-popover-panel expression-node-dropdown"
              : "dropdown-popover-panel"
          }
          style={{
            ...(anchoredMenu
              ? { positionAnchor: selectionAnchorName }
              : {
                  position: "relative",
                  marginTop: "0.5rem",
                  maxWidth: "26rem",
                }),
            zIndex: 100,
            padding: "0.5rem",
            background: "var(--surface-opaque)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
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
              placeholder={
                expectedType !== "any"
                  ? label(
                      language,
                      `Search (expected: ${expectedType})...`,
                      `検索 (期待型: ${expectedType})...`,
                      `Serĉi (${expectedType})...`,
                    )
                  : label(
                      language,
                      "Search expression or operator...",
                      "式・演算子・パーツを検索...",
                      "Serĉi esprimon...",
                    )
              }
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
              }}
            >
              ⌫
            </button>
          </div>

          <div
            ref={listRef}
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
                const isCurrent = opt.value === currentOptionValue;
                const isMismatch =
                  expectedType !== "any" &&
                  opt.returnType !== expectedType &&
                  opt.returnType !== "any";

                // 型不一致グループの先頭に区切りを表示
                const isFirstMismatch =
                  isMismatch &&
                  idx > 0 &&
                  (filteredOptions[idx - 1]?.returnType === expectedType ||
                    filteredOptions[idx - 1]?.returnType === "any");

                return (
                  <div
                    key={opt.value}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    {isFirstMismatch && (
                      <div
                        style={{
                          padding: "0.3rem 0.5rem 0.15rem 0.5rem",
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          borderTop: "1px solid var(--border)",
                          marginTop: "0.3rem",
                          fontWeight: 600,
                          userSelect: "none",
                        }}
                      >
                        {label(
                          language,
                          "Other (Type mismatch)",
                          "その他 (型が合わない)",
                          "Aliaj (Malkongrua tipo)",
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="dropdown-option"
                      data-state={isHighlighted ? "highlighted" : ""}
                      data-current={isCurrent ? "true" : undefined}
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
                          : isMismatch
                            ? "var(--text-muted)"
                            : "var(--text)",
                        cursor: "pointer",
                        textAlign: "left",
                        opacity: isMismatch ? 0.75 : 1,
                      }}
                      onClick={() => {
                        applyOption(opt.value);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(idx);
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {opt.label}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              padding: "0.05rem 0.3rem",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-selection)",
                              color: "var(--primary)",
                              fontWeight: 500,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {opt.category}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

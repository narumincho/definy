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
import { Link } from "@void/react";
import { computeLayout, expressionToLayoutNode } from "./engine.ts";
import {
  applySelection,
  clearExpressionAtPath,
  getExpressionAtPath,
  setNumberValue,
  setStringValue,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import {
  isSamePath,
  pathToString,
  type LayoutNode,
  type PathStep,
} from "./types.ts";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";
import {
  inferExpectedType,
  getOptionValueForExpression,
  type ExpectedType,
} from "./type_inference.ts";
import {
  navigate,
  navKeyFromEvent,
  type NavKey,
  type NavNode,
} from "./keyboard.ts";
import {
  BASE_SELECTOR_OPTIONS,
  filterAndRankOptions,
  highlightIndex,
  isTypeMismatch,
  partSelectorOptions,
  TYPE_SELECTOR_OPTIONS,
  typePartSelectorOptions,
  resolveHighlight,
  variableSelectorOptions,
  type SelectorOption,
} from "./selector_options.ts";

export type ExpressionTreeEditorProps = {
  readonly expression: unknown;
  readonly partType?: unknown;
  readonly onChange?: (newExpression: unknown) => void;
  readonly editable?: boolean;
  readonly maxWidth?: number;
  /** ツリーの枠の要素 ID. 外側 (パーツ定義のツリーなど) からフォーカスを移すときに使う */
  readonly containerId?: string;
  /**
   * キー操作でツリーの外へ出ようとしたとき (ルートで Q, 端で上下移動, 未選択で Escape) に呼ばれる.
   * 指定しなければ何もしない
   */
  readonly onExit?: (key: NavKey) => void;
  /**
   * "type" ならパーツの型の行の型のツリーエディタにする (part_type.ts の型の式を編集する).
   * 選択肢は型と型のパーツだけで, 期待型の推論はしない
   */
  readonly mode?: "expression" | "type";
};

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

/** 表示順 (行きがけ順) にノード ID とパスを集める */
function collectNodeIndex(node: LayoutNode): ReadonlyArray<{
  readonly id: string;
  readonly path: ReadonlyArray<PathStep>;
}> {
  return [
    { id: node.id, path: node.path },
    ...node.children.flatMap(collectNodeIndex),
  ];
}

/** そのパスの式を表すノード (式 1 つ分のノード) を探す */
function findExpressionNode(
  node: LayoutNode,
  path: ReadonlyArray<PathStep>,
): LayoutNode | null {
  if (node.scopeVariables !== undefined && isSamePath(node.path, path)) {
    return node;
  }
  for (const child of node.children) {
    const found = findExpressionNode(child, path);
    if (found !== null) return found;
  }
  return null;
}

const TREE_INTERCEPT_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  "Escape",
  "Delete",
  "Backspace",
]);

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function ExpressionTreeEditor({
  expression,
  partType,
  onChange,
  editable = true,
  maxWidth = 720,
  containerId,
  onExit,
  mode = "expression",
}: ExpressionTreeEditorProps): JSX.Element {
  const { language, parts, partNames } = useDefiny();
  const [selectedPath, setSelectedPath] =
    useState<ReadonlyArray<PathStep> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /** メニューを開くたびに増やし, 開いた直後の処理 (検索欄へのフォーカス・スクロール) を行う */
  const [menuOpenCount, setMenuOpenCount] = useState(0);
  /** 開いたときに現在の名前を入れておく検索欄の値 */
  const [searchQuery, setSearchQuery] = useState("");
  /** 検索欄をユーザーが書き換えたか. 書き換えるまでは絞り込まずに全部の選択肢を出す */
  const [queryEdited, setQueryEdited] = useState(false);
  /** 矢印キーや検索語の入力で選んだ選択肢. null なら現在値を示すだけ */
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  /**
   * キーボードで選択を移動している間は false にして,
   * リテラルの入力欄にフォーカスを奪われないようにする (WASD が入力欄に吸われないようにするため)
   */
  const [inlineEdit, setInlineEdit] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // useId の値は `:` などを含むので, CSS の dashed-ident に使える文字だけにする
  const selectionAnchorName = `--expression-selection-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const layoutRoot = useMemo(() => {
    const rawTree = expressionToLayoutNode(expression, "root", { partNames });
    return computeLayout(rawTree, { maxWidth });
  }, [expression, partNames, maxWidth]);

  // キーボード移動用: 表示順 (行きがけ順) のノード ID とパス
  const nodeIndex = useMemo(() => collectNodeIndex(layoutRoot), [layoutRoot]);

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

  function focusContainer(): void {
    containerRef.current?.focus({ preventScroll: true });
  }

  /**
   * 選択した式のメニューを開く (クリック・Enter キー).
   * 検索欄には選択中の式の名前を入れておく (開いた直後に全選択するので, 打てば置き換わる)
   */
  function openMenu(
    path: ReadonlyArray<PathStep>,
    initialQuery: string = currentNameAt(path),
  ): void {
    setSelectedPath(path);
    setInlineEdit(true);
    if (!editable) return;
    setIsMenuOpen(true);
    setMenuOpenCount((n) => n + 1);
    setChosenIndex(null);
    setQueryEdited(false);
    setSearchQuery(initialQuery);
  }

  function closeMenu(): void {
    setIsMenuOpen(false);
    setSearchQuery("");
    setQueryEdited(false);
    setChosenIndex(null);
  }

  /** メニュー・入力欄からツリーに戻る. 選択は残し, 続けてキーで移動できるようにする */
  function returnToTree(): void {
    closeMenu();
    setInlineEdit(false);
    focusContainer();
  }

  const handleSelectNode = (_id: string, path: ReadonlyArray<PathStep>) => {
    openMenu(path);
  };

  const handleChangeNumber = useCallback(
    (path: ReadonlyArray<PathStep>, value: number) => {
      if (!onChange) return;
      onChange(setNumberValue(expression, path, value));
    },
    [expression, onChange],
  );

  const handleChangeString = useCallback(
    (path: ReadonlyArray<PathStep>, value: string) => {
      if (!onChange) return;
      onChange(setStringValue(expression, path, value));
    },
    [expression, onChange],
  );

  /**
   * 式を未入力にし, すぐ別の式を選べるようにメニューを開いて検索欄にフォーカスする
   */
  function handleClear(path: ReadonlyArray<PathStep>): void {
    if (!onChange || !editable) return;
    onChange(clearExpressionAtPath(expression, path));
    openMenu(path, "");
  }

  const expectedType = useMemo<ExpectedType>(() => {
    if (!selectedPath || mode === "type") return "any";
    return inferExpectedType(expression, selectedPath, partType);
  }, [expression, selectedPath, partType, mode]);

  const selectedLayoutNode = useMemo(
    () => (selectedPath ? findExpressionNode(layoutRoot, selectedPath) : null),
    [layoutRoot, selectedPath],
  );

  const partOptions = useMemo(
    () =>
      mode === "type"
        ? typePartSelectorOptions(parts)
        : partSelectorOptions(parts),
    [parts, mode],
  );

  /** その位置の選択肢. その位置から参照できる変数 (関数のパラメーター・let・match の束縛) を先頭に出す */
  function selectorOptionsAt(
    path: ReadonlyArray<PathStep>,
  ): ReadonlyArray<SelectorOption> {
    if (mode === "type") {
      return [...TYPE_SELECTOR_OPTIONS, ...partOptions];
    }
    return [
      ...variableSelectorOptions(
        findExpressionNode(layoutRoot, path)?.scopeVariables ?? new Map(),
      ),
      ...BASE_SELECTOR_OPTIONS,
      ...partOptions,
    ];
  }

  /** その位置の式に対応する選択肢の value */
  function currentOptionValueAt(
    path: ReadonlyArray<PathStep>,
    options: ReadonlyArray<SelectorOption>,
  ): string | null {
    const target = getExpressionAtPath(expression, path);
    const value =
      mode === "type" &&
      typeof target === "object" &&
      target !== null &&
      "TypeLiteral" in target
        ? "expr:type:record"
        : getOptionValueForExpression(target);
    if (
      value === null ||
      !value.startsWith("ref:part:") ||
      options.some((o) => o.value === value)
    ) {
      return value;
    }
    // 参照しているパーツ ID が選択肢の ID と違う (別のアカウントのコミットなど) ときは名前で対応させる
    const partId = partNames.get(value.slice("ref:part:".length));
    return options.find((o) => o.partId === partId)?.value ?? value;
  }

  /** その位置の式の名前. 検索欄の初期値とメニューの見出しに使う */
  function currentNameAt(path: ReadonlyArray<PathStep>): string {
    const options = selectorOptionsAt(path);
    const value = currentOptionValueAt(path, options);
    return (
      options.find((o) => o.value === value)?.name ??
      findExpressionNode(layoutRoot, path)?.label ??
      ""
    );
  }

  const selectorOptions = selectedPath ? selectorOptionsAt(selectedPath) : [];
  const currentOptionValue = selectedPath
    ? currentOptionValueAt(selectedPath, selectorOptions)
    : null;
  const currentName = selectedPath ? currentNameAt(selectedPath) : "";

  const filteredOptions = filterAndRankOptions(
    selectorOptions,
    queryEdited ? searchQuery : "",
    expectedType,
  );

  const highlight = resolveHighlight(
    chosenIndex,
    filteredOptions,
    currentOptionValue,
  );
  const effectiveHighlightIndex = highlightIndex(highlight);

  function applyOption(optionValue: string): void {
    if (!selectedPath || !onChange) return;
    // 現在と同じ選択肢を選び直しても式を作り直さない (中身が初期値に戻ってしまうため)
    if (optionValue !== currentOptionValue) {
      onChange(applySelection(expression, selectedPath, optionValue));
    }
    returnToTree();
  }

  /** 画面に表示されているノードの矩形を, 式のパスごとに 1 つ (表示順で最初の要素) 集める */
  function collectNavNodes(): ReadonlyArray<NavNode> {
    const container = containerRef.current;
    if (!container) return [];
    const pathById = new Map(nodeIndex.map((n) => [n.id, n.path]));
    const seen = new Set<string>();
    const nodes: NavNode[] = [];
    for (const element of container.querySelectorAll<HTMLElement>(
      "[data-node-id]",
    )) {
      const path = pathById.get(element.dataset.nodeId ?? "");
      if (path === undefined) continue;
      const key = pathToString(path);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = element.getBoundingClientRect();
      nodes.push({
        path,
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      });
    }
    return nodes;
  }

  function scrollNodeIntoView(path: ReadonlyArray<PathStep>): void {
    const id = nodeIndex.find((n) => isSamePath(n.path, path))?.id;
    if (id === undefined) return;
    containerRef.current
      ?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function exitTree(key: NavKey): void {
    closeMenu();
    setSelectedPath(null);
    onExit?.(key);
  }

  // docs/key.md のキー操作. メニューの検索欄やリテラルの入力欄で押されたキーもここまで伝わる
  function handleContainerKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const navKey = navKeyFromEvent(e);
    // このツリーで処理したキーは外側 (パーツ定義のツリーなど) に二重に処理させない
    if (navKey !== null || TREE_INTERCEPT_KEYS.has(e.key)) {
      e.stopPropagation();
    }

    if (isTextInput(e.target)) {
      // 入力欄を抜けたらツリーにフォーカスを戻し, 続けてキーで移動できるようにする
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        returnToTree();
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      openMenu(selectedPath ?? nodeIndex[0]?.path ?? []);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // 何も選んでいないときの Escape はツリーの外へ戻る
      if (selectedPath === null) {
        exitTree("parent");
      } else {
        closeMenu();
        setSelectedPath(null);
      }
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selectedPath) {
      e.preventDefault();
      handleClear(selectedPath);
      return;
    }
    if (navKey === null) return;
    e.preventDefault();
    const next = navigate(collectNavNodes(), selectedPath, navKey);
    if (next === null) {
      // ルートより上・ツリーの端より先へは, 外側に移動を任せる
      const leavesTree =
        navKey === "up" ||
        navKey === "down" ||
        ((navKey === "parent" || navKey === "root") &&
          selectedPath !== null &&
          selectedPath.length === 0);
      if (leavesTree && onExit) {
        exitTree(navKey);
      }
      return;
    }
    closeMenu();
    setInlineEdit(false);
    setSelectedPath(next);
    scrollNodeIntoView(next);
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length === 0) return;
      setChosenIndex(
        effectiveHighlightIndex === null
          ? 0
          : e.key === "ArrowDown"
            ? Math.min(effectiveHighlightIndex + 1, filteredOptions.length - 1)
            : Math.max(effectiveHighlightIndex - 1, 0),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      // 決定した Enter をツリーのキー操作として二重に処理させない
      e.stopPropagation();
      // 矢印キーや検索で選んだ選択肢だけを適用する.
      // 開いた直後の Enter (現在値が仮にハイライトされているだけ) で式を置き換えない
      const chosen =
        highlight.kind === "chosen" ? filteredOptions[highlight.index] : null;
      if (chosen) {
        applyOption(chosen.value);
      } else {
        returnToTree();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      returnToTree();
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      e.currentTarget.value.length === 0 &&
      selectedPath
    ) {
      // 検索欄が空のときだけ選択中の式を未入力にする. 文字が残っている間は通常どおり文字を消す
      e.preventDefault();
      e.stopPropagation();
      handleClear(selectedPath);
    }
  }

  const isLiteralSelected =
    selectedLayoutNode?.kind === "literalNumber" ||
    selectedLayoutNode?.kind === "literalString";

  // メニューを開いた直後: 検索欄 (現在の名前が入っている) を全選択し (打てば置き換わる),
  // 現在の選択肢がリストの中央に来るようにスクロールする.
  // 数値・文字列リテラルはノード上で直接編集するので検索欄にフォーカスを移さない
  useEffect(() => {
    if (menuOpenCount === 0) return;
    // requestAnimationFrame は裏のタブで止まり, その間に打ったキーがツリーの移動になるので使わない.
    // popover の表示は ref コールバック (コミット中) で済んでいるので, ここでフォーカスできる
    const input = searchInputRef.current;
    if (input && !isLiteralSelected) {
      input.focus();
      input.select();
    }
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[data-current="true"]');
    if (list && selected) {
      list.scrollTop =
        selected.offsetTop - (list.clientHeight - selected.clientHeight) / 2;
    }
    // 開いたときだけ行う
  }, [menuOpenCount]);

  // キー操作でハイライトが移動したときに追従スクロールする
  useEffect(() => {
    if (!isMenuOpen || chosenIndex === null) return;
    listRef.current
      ?.querySelector(`[data-index="${chosenIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [chosenIndex, isMenuOpen]);

  // メニューはユーザー操作で開くので, 判定はブラウザ上でのみ行われる
  const anchoredMenu = isMenuOpen && supportsAnchoredPopover();

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="expression-tree-container"
      tabIndex={0}
      aria-label={label(
        language,
        "Expression tree (WASD / arrows to move, Q / E for parent / child, Enter to edit)",
        "式のツリー (WASD・矢印で移動, Q / E で親 / 子, Enter で編集)",
        "Esprimarbo (WASD / sagoj por movi, Q / E por gepatro / ido, Enter por redakti)",
      )}
      onKeyDown={handleContainerKeyDown}
      onFocus={(e) => {
        // キーボードでフォーカスを移してきたときは, すぐ移動できるようにルートを選んでおく
        // (同じイベント処理の中で選んだ式は上書きしない)
        const root = nodeIndex[0];
        if (e.target === e.currentTarget && selectedPath === null && root) {
          setInlineEdit(false);
          setSelectedPath((prev) => prev ?? root.path);
        }
      }}
      onBlur={(e) => {
        // ツリーの外にフォーカスが移ったらメニューを閉じる
        if (
          isMenuOpen &&
          !(
            e.relatedTarget instanceof Node &&
            e.currentTarget.contains(e.relatedTarget)
          )
        ) {
          closeMenu();
        }
      }}
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
            {mode === "type"
              ? label(language, "Type Tree", "型の木構造", "Tipa Arbo")
              : label(
                  language,
                  "Expression Tree",
                  "式の木構造",
                  "Esprima Arbo",
                )}
          </span>
          {editable && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {label(
                language,
                "(Click / Enter to replace, WASD to move, Q / E for parent / child, Del to clear)",
                "(クリック / Enter で置換, WASD で移動, Q / E で親 / 子, Del で未入力化)",
                "(Alklaku / Enter por anstataŭigi, WASD por movi)",
              )}
            </span>
          )}
        </div>
      </div>

      <TreeLayoutRenderer
        node={layoutRoot}
        selectedPath={selectedPath}
        hoveredId={hoveredId}
        collapsedIds={collapsedIds}
        editable={editable}
        inlineEdit={inlineEdit}
        onSelectNode={handleSelectNode}
        onHoverNode={setHoveredId}
        onToggleCollapse={toggleCollapse}
        onChangeNumber={handleChangeNumber}
        onChangeString={handleChangeString}
        onClear={handleClear}
        {...(selectionAnchorName !== undefined ? { selectionAnchorName } : {})}
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
            maxHeight: "20rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              flexWrap: "wrap",
              padding: "0.4rem 0.6rem",
              borderBottom: "1px solid var(--border)",
              fontSize: "0.76rem",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--primary)",
                whiteSpace: "nowrap",
              }}
            >
              {label(language, "Selected:", "選択中:", "Elektita:")}
            </span>
            <span
              className="mono"
              title={currentName}
              style={{
                background: "var(--bg-inset)",
                padding: "0.08rem 0.45rem",
                borderRadius: "var(--radius-full)",
                color: "var(--green)",
                border: "1px solid var(--overlay-3)",
                maxWidth: "14rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentName}
            </span>
            {expectedType !== "any" && (
              <span
                style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}
              >
                {label(language, "Expects:", "期待:", "Atendas:")}{" "}
                <span
                  className="mono"
                  style={{ color: "var(--blue-text)", fontWeight: 600 }}
                >
                  {expectedType}
                </span>
              </span>
            )}
            <button
              type="button"
              className="dropdown-header-button"
              style={{ marginLeft: "auto" }}
              title={label(
                language,
                "Clear (Delete)",
                "未入力にする (Delete)",
                "Malplenigi (Delete)",
              )}
              onClick={() => {
                handleClear(selectedPath);
              }}
            >
              ⌫
            </button>
            <button
              type="button"
              className="dropdown-header-button"
              title={label(language, "Deselect", "選択解除", "Malelekti")}
              onClick={() => {
                closeMenu();
                setSelectedPath(null);
              }}
            >
              ✕
            </button>
          </div>

          <input
            ref={searchInputRef}
            type="text"
            className="dropdown-search-input"
            placeholder={label(
              language,
              "Search expression, operator or part...",
              "式・演算子・パーツを検索...",
              "Serĉi esprimon...",
            )}
            value={searchQuery}
            onFocus={(e) => {
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setQueryEdited(true);
              setChosenIndex(0);
            }}
            onKeyDown={handleMenuKeyDown}
          />

          <div
            ref={listRef}
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              maxHeight: "15rem",
              display: "flex",
              flexDirection: "column",
              position: "relative",
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
                const isMismatch = isTypeMismatch(opt, expectedType);
                // 型が合わない選択肢の先頭に区切りを表示 (先頭なら区切る必要がないので出さない)
                const isFirstMismatch =
                  isMismatch &&
                  idx > 0 &&
                  !isTypeMismatch(
                    filteredOptions[idx - 1] ?? opt,
                    expectedType,
                  );
                const isCurrent = opt.value === currentOptionValue;
                return (
                  <OptionItem
                    key={opt.value}
                    option={opt}
                    index={idx}
                    headingBefore={
                      isFirstMismatch
                        ? label(
                            language,
                            "Other (type does not match)",
                            "その他 (型が合わない)",
                            "Aliaj (tipo ne kongruas)",
                          )
                        : null
                    }
                    isHighlighted={idx === effectiveHighlightIndex}
                    isCurrent={isCurrent}
                    isSecondary={isMismatch}
                    linkTitle={label(
                      language,
                      "Open part page",
                      "パーツのページを開く",
                      "Malfermi la paĝon de la parto",
                    )}
                    onHighlight={() => {
                      setChosenIndex(idx);
                    }}
                    onSelect={() => {
                      applyOption(opt.value);
                    }}
                    onOpenLink={closeMenu}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionItem({
  option,
  index,
  headingBefore,
  isHighlighted,
  isCurrent,
  isSecondary,
  linkTitle,
  onHighlight,
  onSelect,
  onOpenLink,
}: {
  readonly option: SelectorOption;
  readonly index: number;
  readonly headingBefore: string | null;
  readonly isHighlighted: boolean;
  readonly isCurrent: boolean;
  readonly isSecondary: boolean;
  readonly linkTitle: string;
  readonly onHighlight: () => void;
  readonly onSelect: () => void;
  readonly onOpenLink: () => void;
}): JSX.Element {
  return (
    <>
      {headingBefore !== null && (
        <div className="dropdown-option-heading">{headingBefore}</div>
      )}
      {/* 見た目は main.css の .dropdown-option[data-state] で付ける */}
      <div
        className="dropdown-option"
        data-index={index}
        data-state={
          isHighlighted ? "highlighted" : isCurrent ? "selected" : undefined
        }
        data-current={isCurrent ? "true" : undefined}
        data-secondary={isSecondary ? "true" : "false"}
        onMouseEnter={onHighlight}
      >
        <button
          type="button"
          className="dropdown-option-button"
          // 検索欄からフォーカスを奪わない (クリックで選んでもメニューの外へ出たとみなさないため)
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={onSelect}
        >
          <span className="dropdown-option-check">{isCurrent ? "✓" : ""}</span>
          <span className="dropdown-option-name">{option.name}</span>
          {option.detail !== undefined && (
            <span className="dropdown-option-detail">{option.detail}</span>
          )}
          <span className="dropdown-option-category">{option.category}</span>
        </button>
        {option.partId !== undefined && (
          <Link
            href={`/part/${option.partId}`}
            className="dropdown-item-link"
            title={linkTitle}
            aria-label={`${linkTitle}: ${option.name}`}
            onClick={onOpenLink}
          >
            ↗
          </Link>
        )}
      </div>
    </>
  );
}

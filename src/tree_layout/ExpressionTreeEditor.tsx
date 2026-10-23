import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useId,
  type JSX,
} from "react";
import { computeLayout, expressionToLayoutNode } from "./engine.ts";
import {
  applySelection,
  clearExpressionAtPath,
  setNumberValue,
  setStringValue,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { label } from "../language.ts";
import {
  expectedTypeFromTypeAst,
  probeExpressionAt,
  type ExpectedType,
} from "./type_inference.ts";
import { type NavKey } from "./keyboard.ts";
import { collectNodeIndex, findExpressionNode } from "./selection.ts";
import { useTreeKeyboard } from "./useTreeKeyboard.ts";
import { useSelectorMenu } from "./useSelectorMenu.ts";
import { ExpressionPopoverMenu } from "./ExpressionPopoverMenu.tsx";
import { findTypeErrorPath } from "./type_error_location.ts";
import type { DefinyValue } from "../stage1_compiler.ts";

/** 式に出す型エラー */
export type ExpressionTypeError = {
  /**
   * 型チェッカーがエラーを見つけた式 (`core.expression` の値). `null` や,
   * ツリーの中に見つからないときはルートの式に出す
   */
  readonly expression: DefinyValue;
  readonly message: string;
};

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
  /** 型エラー. エラーのある式の横に警告を出す */
  readonly typeError?: ExpressionTypeError | null;
};

export function ExpressionTreeEditor({
  expression,
  partType,
  onChange,
  editable = true,
  maxWidth = 720,
  containerId,
  onExit,
  mode = "expression",
  typeError = null,
}: ExpressionTreeEditorProps): JSX.Element {
  const { language, parts, partNames, findExpectedType } = useDefiny();
  const [selectedPath, setSelectedPath] =
    useState<ReadonlyArray<PathStep> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  /**
   * キーボードで選択を移動している間は false にして,
   * リテラルの入力欄にフォーカスを奪われないようにする (WASD が入力欄に吸われないようにするため)
   */
  const [inlineEdit, setInlineEdit] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // useId の値は `:` などを含むので, CSS の dashed-ident に使える文字だけにする
  const selectionAnchorName = `--expression-selection-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const layoutRoot = useMemo(() => {
    const rawTree = expressionToLayoutNode(expression, "root", { partNames });
    return computeLayout(rawTree, { maxWidth });
  }, [expression, partNames, maxWidth]);

  const typeErrorNodeId = useMemo(() => {
    if (typeError === null) return null;
    const path =
      typeError.expression === null
        ? null
        : findTypeErrorPath(layoutRoot, expression, typeError.expression);
    return (
      (path === null ? null : findExpressionNode(layoutRoot, path))?.id ??
      layoutRoot.id
    );
  }, [typeError, layoutRoot, expression]);

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

  // 選んだ位置で期待する型は, その位置を未入力 (probe) にした式を definy 製の型チェッカーで検査して求める
  const [expectedType, setExpectedType] = useState<ExpectedType>("any");
  useEffect(() => {
    setExpectedType("any");
    if (!selectedPath || mode === "type" || partType == null) {
      return;
    }
    let cancelled = false;
    findExpectedType({
      partType,
      expression: probeExpressionAt(expression, selectedPath),
    }).then(
      (type) => {
        if (!cancelled) {
          setExpectedType(expectedTypeFromTypeAst(type));
        }
      },
      (e: unknown) => {
        console.error("failed to find the expected type", e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [expression, selectedPath, partType, mode, findExpectedType]);

  const menu = useSelectorMenu({
    mode,
    editable,
    expression,
    selectedPath,
    layoutRoot,
    parts,
    partNames,
    expectedType,
    setSelectedPath,
    setInlineEdit,
  });

  const selectedLayoutNode = useMemo(
    () => (selectedPath ? findExpressionNode(layoutRoot, selectedPath) : null),
    [layoutRoot, selectedPath],
  );

  const isLiteralSelected =
    selectedLayoutNode?.kind === "literalNumber" ||
    selectedLayoutNode?.kind === "literalString";

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
  const handleClear = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      if (!onChange || !editable) return;
      onChange(clearExpressionAtPath(expression, path));
      menu.openMenu(path, "");
    },
    [editable, menu, onChange, expression],
  );

  const keyboard = useTreeKeyboard({
    containerRef,
    selectedPath,
    setSelectedPath,
    nodeIndex,
    onExit,
    openMenu: menu.openMenu,
    closeMenu: menu.closeMenu,
    handleClear,
    setInlineEdit,
  });

  const applyOption = useCallback(
    (optionValue: string): void => {
      if (!selectedPath || !onChange) return;
      // 現在と同じ選択肢を選び直しても式を作り直さない (中身が初期値に戻ってしまうため)
      if (optionValue !== menu.currentOptionValue) {
        onChange(applySelection(expression, selectedPath, optionValue));
      }
      keyboard.returnToTree();
    },
    [expression, keyboard, menu.currentOptionValue, onChange, selectedPath],
  );

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
      onKeyDown={keyboard.handleContainerKeyDown}
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
          menu.isMenuOpen &&
          !(
            e.relatedTarget instanceof Node &&
            e.currentTarget.contains(e.relatedTarget)
          )
        ) {
          menu.closeMenu();
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
      <TreeLayoutRenderer
        node={layoutRoot}
        selectedPath={selectedPath}
        hoveredId={hoveredId}
        collapsedIds={collapsedIds}
        editable={editable}
        inlineEdit={inlineEdit}
        onSelectNode={(_id, path) => {
          menu.openMenu(path);
        }}
        onHoverNode={setHoveredId}
        onToggleCollapse={toggleCollapse}
        onChangeNumber={handleChangeNumber}
        onChangeString={handleChangeString}
        onClear={handleClear}
        {...(selectionAnchorName !== undefined ? { selectionAnchorName } : {})}
        typeErrorNodeId={typeErrorNodeId}
        typeErrorMessage={typeError?.message ?? ""}
      />

      {/*
       * 式の置換メニュー. 対応ブラウザでは popover (top layer) にして,
       * CSS Anchor Positioning で選択中のノードのすぐ下に表示する
       */}
      {menu.isMenuOpen && editable && selectedPath && (
        <ExpressionPopoverMenu
          language={language}
          selectedPath={selectedPath}
          selectionAnchorName={selectionAnchorName}
          currentName={menu.currentName}
          expectedType={expectedType}
          searchQuery={menu.searchQuery}
          setSearchQuery={menu.setSearchQuery}
          setQueryEdited={menu.setQueryEdited}
          chosenIndex={menu.chosenIndex}
          setChosenIndex={menu.setChosenIndex}
          filteredOptions={menu.filteredOptions}
          currentOptionValue={menu.currentOptionValue}
          highlight={menu.highlight}
          effectiveHighlightIndex={menu.effectiveHighlightIndex}
          isLiteralSelected={isLiteralSelected}
          menuOpenCount={menu.menuOpenCount}
          onClear={handleClear}
          onClose={() => {
            menu.closeMenu();
            setSelectedPath(null);
          }}
          onApplyOption={applyOption}
          onReturnToTree={keyboard.returnToTree}
        />
      )}
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, useId, type JSX } from "react";
import {
  computeLayout,
  expressionToLayoutNode,
  reuseUnchangedNodes,
} from "./engine.ts";
import {
  clearExpressionAtPath,
  functionParameterTypes,
  setNumberValue,
  setStringValue,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { pathToString, type LayoutNode, type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { referenceViolation } from "../visibility.ts";
import { label, withLanguage } from "../language.ts";
import { useRouter } from "@void/react";
import { ExpressionHoverCard } from "./ExpressionHoverCard.tsx";
import type { NavKey } from "./keyboard.ts";
import {
  collectNodeIndex,
  findExpressionNode,
  findSelectedNode,
} from "./selection.ts";
import { useTreeKeyboard } from "./useTreeKeyboard.ts";
import { useSelectorMenu } from "./useSelectorMenu.ts";
import { ExpressionPopoverMenu } from "./ExpressionPopoverMenu.tsx";
import { findTypeErrorPath } from "./type_error_location.ts";
import { isMatchPatternPath } from "./match_pattern.ts";
import { isVariableNamePath, renameVariableAt } from "./local_variable.ts";
import {
  findDefinitionTarget,
  type DefinitionTarget,
} from "./go_to_definition.ts";
import { recordFieldNamesOfType } from "./record_fields.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import { callParameterNamesOf } from "./part_type.ts";
import { isVariant } from "../definy_value.ts";
import { useInferredTypeArguments } from "./useInferredTypeArguments.ts";
import { useExpectedType } from "./useExpectedType.ts";
import { useExpressionHover } from "./useExpressionHover.ts";
import { useDefinitionLink } from "./useDefinitionLink.ts";
import { useExpressionClipboard } from "./useExpressionClipboard.ts";
import { useApplyOption } from "./useApplyOption.ts";

/** 式に出す型エラー */
export type ExpressionTypeError = {
  /**
   * 型チェッカーがエラーを見つけた式 (`core.expression` の値). `null` や,
   * ツリーの中に見つからないときはルートの式に出す
   */
  readonly expression: DefinyValue;
  readonly message: string;
};

type ExpressionTreeEditorProps = {
  readonly expression: unknown;
  readonly partType?: unknown;
  /**
   * 式を変えたとき. 数値・文字列・名前の入力欄で打った変更には, 元に戻す (Undo) の履歴で
   * 1 つにまとめるためのキー `mergeKey` (入力欄のパスごと) を付ける
   */
  readonly onChange?: (newExpression: unknown, mergeKey?: string) => void;
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
  /** 編集しているパーツのモジュール. 参照できない (非公開の) パーツを選択肢から外す (docs/visibility.md) */
  readonly moduleName?: string;
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
  moduleName,
}: ExpressionTreeEditorProps): JSX.Element {
  const {
    language,
    // コミットしていない新しいパーツも参照できるよう, 作業中の変更を重ねたパーツを使う (src/working_parts.ts)
    workingParts: allParts,
    workingPartNames: partNames,
    workingPartsByIdHash: partsByIdHash,
    findExpectedType,
    findInferredTypeArgument,
    visibilityTargets,
    projectOfModule,
  } = useDefiny();
  // 参照できるパーツだけを選択肢にする
  const parts = useMemo(() => {
    if (moduleName === undefined) {
      return allParts;
    }
    const from = {
      projectName: projectOfModule(moduleName) ?? moduleName,
      moduleName,
    };
    return allParts.filter((part) => {
      const target =
        part.partIdHash === null
          ? undefined
          : visibilityTargets.get(part.partIdHash);
      return target === undefined || referenceViolation(from, target) === null;
    });
  }, [allParts, moduleName, projectOfModule, visibilityTargets]);
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

  // 未入力の型引数の推論した型 (値のパス → core.type-ast) と枠に出す型の文字列 (docs/type-arguments.md「エディタ」)
  const { types: inferredTypeArguments, holeHints } = useInferredTypeArguments({
    expression,
    partType,
    mode,
    partNames,
    partsByIdHash,
    findInferredTypeArgument,
  });

  // 呼び出しの引数はデータ上の順番によらず, 呼び出すパーツの引数の宣言の順に表示する
  const callParameterNames = useMemo(
    () => callParameterNamesOf(partsByIdHash),
    [partsByIdHash],
  );

  // 変わっていない部分木は前のノードを使い, 描画を飛ばせるようにする (#762)
  const previousLayoutRoot = useRef<LayoutNode | null>(null);
  const layoutRoot = useMemo(() => {
    const rawTree = expressionToLayoutNode(expression, "root", {
      partNames,
      callParameterNames,
      holeHints,
    });
    const root = reuseUnchangedNodes(
      previousLayoutRoot.current,
      computeLayout(rawTree, { maxWidth }),
    );
    previousLayoutRoot.current = root;
    return root;
  }, [expression, partNames, callParameterNames, holeHints, maxWidth]);

  // 関数の引数の型. 関数型の変数を置換メニューで選んだときに, その引数名で呼び出しにする
  const parameterTypes = useMemo(
    () =>
      functionParameterTypes(
        expression,
        partType,
        (hash) => partsByIdHash.get(hash)?.partType,
      ),
    [expression, partType, partsByIdHash],
  );

  // レコード型の変数のフィールド名. 置換メニューにフィールドを取り出す選択肢 (`p.key`) を出す
  const recordFieldsOfVariable = useCallback(
    (variableId: number): ReadonlyArray<string> | undefined =>
      recordFieldNamesOfType(
        parameterTypes.get(variableId),
        (hash) => partsByIdHash.get(hash)?.expression,
      ),
    [parameterTypes, partsByIdHash],
  );

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

  const {
    expectedType,
    expectedTypeAst,
    patternVariants,
    expectedVariants,
    expectedTypeRef,
  } = useExpectedType({
    expression,
    selectedPath,
    partType,
    mode,
    findExpectedType,
    partsByIdHash,
  });

  const menu = useSelectorMenu({
    mode,
    editable,
    expression,
    selectedPath,
    layoutRoot,
    parts,
    partNames,
    expectedType,
    expectsType: isVariant(expectedTypeAst, "type"),
    patternVariants,
    expectedVariants,
    setSelectedPath,
    setInlineEdit,
    inferredTypeArguments: holeHints,
    recordFieldsOfVariable,
  });

  const hoverCard = useExpressionHover({
    hoveredId,
    isMenuOpen: menu.isMenuOpen,
    layoutRoot,
    expression,
    mode,
    partType,
    findExpectedType,
    partsByIdHash,
    language,
  });

  const selectedLayoutNode = useMemo(
    () => (selectedPath ? findSelectedNode(layoutRoot, selectedPath) : null),
    [layoutRoot, selectedPath],
  );

  const isLiteralSelected =
    selectedLayoutNode?.kind === "literalNumber" ||
    selectedLayoutNode?.kind === "literalString" ||
    selectedLayoutNode?.kind === "parameterName";

  const handleChangeNumber = useCallback(
    (path: ReadonlyArray<PathStep>, value: number) => {
      if (!onChange) return;
      onChange(
        setNumberValue(expression, path, value),
        `text:${pathToString(path)}`,
      );
    },
    [expression, onChange],
  );

  const handleChangeString = useCallback(
    (path: ReadonlyArray<PathStep>, value: string) => {
      if (!onChange) return;
      // 関数の引数名・let や match で束縛する変数の名前の入力欄も文字列と同じ入力欄を使う
      onChange(
        isVariableNamePath(path)
          ? renameVariableAt(expression, path, value)
          : setStringValue(expression, path, value),
        `text:${pathToString(path)}`,
      );
    },
    [expression, onChange],
  );

  /**
   * 式を未入力にし, すぐ別の式を選べるようにメニューを開いて検索欄にフォーカスする
   */
  const handleClear = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      // 変数の名前・match のパターンは式ではないので未入力にできない
      if (
        !onChange ||
        !editable ||
        isVariableNamePath(path) ||
        isMatchPatternPath(path)
      ) {
        return;
      }
      onChange(clearExpressionAtPath(expression, path));
      menu.openMenu(path, "");
    },
    [editable, menu, onChange, expression],
  );

  const findDefinition = useCallback(
    (path: ReadonlyArray<PathStep>): DefinitionTarget | null =>
      findDefinitionTarget(expression, path),
    [expression],
  );

  const router = useRouter();
  /** パーツの詳細ページを開く. 開けるパーツでなければ `false` */
  const openPart = useCallback(
    (partIdHash: string): boolean => {
      const part = partsByIdHash.get(partIdHash);
      if (part === undefined) {
        return false;
      }
      router.visit(withLanguage(`/part/${part.partId}`, language));
      return true;
    },
    [language, partsByIdHash, router],
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
    findDefinition,
    openPart,
  });

  /** 定義へ移動する (Ctrl / Cmd + クリック). 移動先が無ければ `false` */
  const goToDefinition = useCallback(
    (path: ReadonlyArray<PathStep>): boolean => {
      const definition = findDefinition(path);
      if (definition === null) {
        return false;
      }
      if (definition.kind === "part") {
        return openPart(definition.partIdHash);
      }
      keyboard.selectInTree(definition.path);
      return true;
    },
    [findDefinition, keyboard, openPart],
  );

  const linkNodeId = useDefinitionLink({
    hoveredId,
    layoutRoot,
    findDefinition,
  });

  const clipboard = useExpressionClipboard({
    containerRef,
    expression,
    layoutRoot,
    mode,
    editable,
    onChange,
    selectedPath,
    returnToTree: keyboard.returnToTree,
  });

  const applyOption = useApplyOption({
    selectedPath,
    onChange,
    expression,
    layoutRoot,
    currentOptionValue: menu.currentOptionValue,
    patternVariants,
    expectedTypeRef,
    inferredTypeArguments,
    partsByIdHash,
    parameterTypes,
    clipboard,
    goToDefinition,
    returnToTree: keyboard.returnToTree,
    selectInTree: keyboard.selectInTree,
  });

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
      // ホバーしているノードは, マウスの下のいちばん内側のノード. 各ノードの mouseenter で決めると,
      // 外側から一度に複数のノードに入ったときに外側のノードが後から設定されることがあるので, 枠で mouseover を受けて決める
      onMouseOver={(e) => {
        const nodeElement =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>("[data-node-id]")
            : null;
        setHoveredId(
          nodeElement !== null && e.currentTarget.contains(nodeElement)
            ? (nodeElement.dataset.nodeId ?? null)
            : null,
        );
      }}
      onMouseLeave={() => {
        setHoveredId(null);
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
        onGoToDefinition={goToDefinition}
        linkNodeId={linkNodeId}
        onToggleCollapse={toggleCollapse}
        onChangeNumber={handleChangeNumber}
        onChangeString={handleChangeString}
        onClear={handleClear}
        {...(selectionAnchorName !== undefined ? { selectionAnchorName } : {})}
        typeErrorNodeId={typeErrorNodeId}
        typeErrorMessage={typeError?.message ?? ""}
      />

      {hoverCard !== null && (
        <ExpressionHoverCard
          key={hoverCard.nodeId}
          language={language}
          containerRef={containerRef}
          {...hoverCard}
        />
      )}

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
          expectedTypeAst={expectedTypeAst}
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

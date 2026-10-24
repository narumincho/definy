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
  functionParameterIndex,
  functionParameterTypes,
  partParameterNames,
  renameFunctionParameter,
  setNumberValue,
  setStringValue,
  variableParameterNames,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { pathToString, type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { label, localizedText } from "../language.ts";
import {
  expectedTypeFromTypeAst,
  findExpressionTypeAt,
  probeExpressionAt,
  type ExpectedType,
  type ExpressionTypeAt,
} from "./type_inference.ts";
import { findHoverTarget, type HoverTarget } from "./hover_info.ts";
import { ExpressionHoverCard } from "./ExpressionHoverCard.tsx";
import { formatTypeAst } from "../self_hosted_type_check.ts";
import { type NavKey } from "./keyboard.ts";
import {
  collectNodeIndex,
  findExpressionNode,
  findSelectedNode,
} from "./selection.ts";
import { useTreeKeyboard } from "./useTreeKeyboard.ts";
import { useSelectorMenu } from "./useSelectorMenu.ts";
import { ExpressionPopoverMenu } from "./ExpressionPopoverMenu.tsx";
import { findTypeErrorPath } from "./type_error_location.ts";
import {
  applyPatternSelection,
  isMatchPatternPath,
  matchArmVariableIndex,
  patternVariantsFromTypeAst,
  probeMatchTargetType,
  renameMatchArmVariable,
  type PatternVariant,
} from "./match_pattern.ts";
import { type DefinyValue } from "../stage1_compiler.ts";

/** 式にマウスを置いてからホバーの表示を出すまでの時間 */
const HOVER_DELAY_MS = 350;

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
  const { language, parts, partNames, partsByIdHash, findExpectedType } =
    useDefiny();
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

  // 選んだ位置で期待する型は, その位置を未入力 (probe) にした式を definy 製の型チェッカーで検査して求める.
  // match のアームのパターンを選んだときは, 代わりに match の対象の型を聞いてパターンで選べるタグにする
  const [expectedType, setExpectedType] = useState<ExpectedType>("any");
  const [patternVariants, setPatternVariants] =
    useState<ReadonlyArray<PatternVariant> | null>(null);
  useEffect(() => {
    setExpectedType("any");
    setPatternVariants(null);
    if (!selectedPath || mode === "type" || partType == null) {
      return;
    }
    // 名前は式ではないので期待する型は無い
    if (
      functionParameterIndex(selectedPath) !== null ||
      matchArmVariableIndex(selectedPath) !== null
    ) {
      return;
    }
    const isPattern = isMatchPatternPath(selectedPath);
    let cancelled = false;
    findExpectedType({
      partType,
      expression: isPattern
        ? probeMatchTargetType(expression, selectedPath)
        : probeExpressionAt(expression, selectedPath),
    }).then(
      (type) => {
        if (cancelled) {
          return;
        }
        if (isPattern) {
          setPatternVariants(patternVariantsFromTypeAst(type, partsByIdHash));
        } else {
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
  }, [
    expression,
    selectedPath,
    partType,
    mode,
    findExpectedType,
    partsByIdHash,
  ]);

  // ホバーした式の型とパーツのドキュメント. マウスを少し止めてから出す. 置換メニューを開いている間は出さない
  const [shownHover, setShownHover] = useState<HoverTarget | null>(null);
  const [hoverType, setHoverType] = useState<{
    readonly key: string;
    readonly type: ExpressionTypeAt | null;
  } | null>(null);
  const hoverKey =
    shownHover === null
      ? null
      : `${shownHover.nodeId}|${pathToString(shownHover.path)}`;

  const menu = useSelectorMenu({
    mode,
    editable,
    expression,
    selectedPath,
    layoutRoot,
    parts,
    partNames,
    expectedType,
    patternVariants,
    setSelectedPath,
    setInlineEdit,
  });

  const hoverTarget = useMemo(
    () =>
      hoveredId === null || menu.isMenuOpen
        ? null
        : findHoverTarget(layoutRoot, expression, hoveredId),
    [hoveredId, menu.isMenuOpen, layoutRoot, expression],
  );
  useEffect(() => {
    if (hoverTarget === null) {
      setShownHover(null);
      return;
    }
    const timer = setTimeout(() => {
      setShownHover(hoverTarget);
    }, HOVER_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hoverTarget]);

  // ホバーした式の型を definy 製の型チェッカーに聞く (型のツリーエディタでは聞かない)
  useEffect(() => {
    if (
      shownHover === null ||
      hoverKey === null ||
      mode === "type" ||
      partType == null
    ) {
      return;
    }
    let cancelled = false;
    findExpressionTypeAt(
      findExpectedType,
      partType,
      expression,
      shownHover.path,
    ).then(
      (type) => {
        if (!cancelled) {
          setHoverType({ key: hoverKey, type });
        }
      },
      (e: unknown) => {
        console.error("failed to find the type of the expression", e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [shownHover, hoverKey, mode, partType, expression, findExpectedType]);

  const hoverCard = useMemo(() => {
    if (shownHover === null || hoverKey === null) {
      return null;
    }
    const part =
      shownHover.partIdHash === null
        ? undefined
        : partsByIdHash.get(shownHover.partIdHash);
    const title =
      part !== undefined
        ? `${part.moduleName}.${part.name}`
        : shownHover.variableName;
    const typeQueried = mode !== "type" && partType != null;
    const typeAt =
      hoverType !== null && hoverType.key === hoverKey ? hoverType.type : null;
    const typeText =
      typeAt === null
        ? null
        : formatTypeAst(typeAt.type, (partId) => partNames.get(partId));
    const type = !typeQueried
      ? null
      : hoverType?.key !== hoverKey
        ? ("loading" as const)
        : typeAt === null || typeText === null
          ? null
          : { kind: typeAt.kind, text: typeText };
    const description =
      part === undefined ? "" : localizedText(part.description, language);
    if (title === null && type === null && description.length === 0) {
      return null;
    }
    return {
      nodeId: shownHover.nodeId,
      title,
      titleKind:
        part !== undefined
          ? ("part" as const)
          : title !== null
            ? ("variable" as const)
            : null,
      type,
      description,
    };
  }, [
    shownHover,
    hoverKey,
    hoverType,
    partsByIdHash,
    partNames,
    mode,
    partType,
    language,
  ]);

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
      onChange(setNumberValue(expression, path, value));
    },
    [expression, onChange],
  );

  const handleChangeString = useCallback(
    (path: ReadonlyArray<PathStep>, value: string) => {
      if (!onChange) return;
      // 関数の引数名・match で束縛する変数の名前の入力欄も文字列と同じ入力欄を使う
      onChange(
        functionParameterIndex(path) !== null
          ? renameFunctionParameter(expression, path, value)
          : matchArmVariableIndex(path) !== null
            ? renameMatchArmVariable(expression, path, value)
            : setStringValue(expression, path, value),
      );
    },
    [expression, onChange],
  );

  /**
   * 式を未入力にし, すぐ別の式を選べるようにメニューを開いて検索欄にフォーカスする
   */
  const handleClear = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      // 関数の引数名・match のパターンは式ではないので未入力にできない
      if (
        !onChange ||
        !editable ||
        functionParameterIndex(path) !== null ||
        isMatchPatternPath(path) ||
        matchArmVariableIndex(path) !== null
      ) {
        return;
      }
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
        onChange(
          !isMatchPatternPath(selectedPath)
            ? applySelection(
                expression,
                selectedPath,
                optionValue,
                (hash) => {
                  const part = partsByIdHash.get(hash);
                  return part === undefined
                    ? undefined
                    : partParameterNames(part);
                },
                (variableId) =>
                  variableParameterNames(parameterTypes.get(variableId)),
              )
            : applyPatternSelection(
                expression,
                selectedPath,
                optionValue,
                patternVariants,
              ),
        );
      }
      keyboard.returnToTree();
    },
    [
      expression,
      keyboard,
      menu.currentOptionValue,
      onChange,
      parameterTypes,
      partsByIdHash,
      patternVariants,
      selectedPath,
    ],
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

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
  functionParameterTypes,
  partParameterNames,
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
import { isTextInput, type NavKey } from "./keyboard.ts";
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
  patternVariantsFromTypeAst,
  probeMatchTargetType,
  type PatternVariant,
} from "./match_pattern.ts";
import {
  findVariableDefinitionPath,
  GO_TO_DEFINITION,
  isVariableNamePath,
  renameVariableAt,
} from "./local_variable.ts";
import { applyListAction, isListAction } from "./list_items.ts";
import { applyLetAction, isLetAction } from "./let_bindings.ts";
import { expectedVariantsFromTypeAst } from "./variant.ts";
import {
  CLIPBOARD_COPY,
  CLIPBOARD_CUT,
  expressionToClipboardText,
  isClipboardAction,
  parseClipboardText,
  pasteExpressionAt,
} from "./clipboard.ts";

const NO_EXPECTED_VARIANTS = expectedVariantsFromTypeAst(null);
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
  const [expectedTypeAst, setExpectedTypeAst] = useState<DefinyValue | null>(
    null,
  );
  const [patternVariants, setPatternVariants] =
    useState<ReadonlyArray<PatternVariant> | null>(null);
  const [expectedVariants, setExpectedVariants] =
    useState(NO_EXPECTED_VARIANTS);
  useEffect(() => {
    setExpectedType("any");
    setExpectedTypeAst(null);
    setPatternVariants(null);
    setExpectedVariants(NO_EXPECTED_VARIANTS);
    if (!selectedPath || mode === "type" || partType == null) {
      return;
    }
    // 名前は式ではないので期待する型は無い
    if (isVariableNamePath(selectedPath)) {
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
          setExpectedTypeAst(type);
          setExpectedVariants(expectedVariantsFromTypeAst(type));
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
    expectedVariants,
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
    const type = !typeQueried
      ? null
      : hoverType?.key !== hoverKey
        ? ("loading" as const)
        : typeAt === null
          ? null
          : { kind: typeAt.kind, type: typeAt.type };
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
    (path: ReadonlyArray<PathStep>) =>
      findVariableDefinitionPath(expression, path),
    [expression],
  );

  /** 選んだ式をクリップボードに書く JSON 文字列. 式でない位置なら `null` */
  const clipboardTextAt = useCallback(
    (path: ReadonlyArray<PathStep>): string | null =>
      isVariableNamePath(path) || isMatchPatternPath(path)
        ? null
        : expressionToClipboardText(
            expression,
            path,
            findExpressionNode(layoutRoot, path)?.scopeVariables,
            mode,
          ),
    [expression, layoutRoot, mode],
  );

  /** 選んだ式を切り取ったあとの式 (未入力にする) */
  const cutAt = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      if (onChange && editable) {
        onChange(clearExpressionAtPath(expression, path));
      }
    },
    [editable, expression, onChange],
  );

  /** クリップボードの文字列を選んだ式に貼り付ける. definy の式でなければ何もしない */
  const pasteAt = useCallback(
    (path: ReadonlyArray<PathStep>, text: string): boolean => {
      if (
        !onChange ||
        !editable ||
        isVariableNamePath(path) ||
        isMatchPatternPath(path)
      ) {
        return false;
      }
      const data = parseClipboardText(text);
      if (data === null) {
        return false;
      }
      const result = pasteExpressionAt(
        expression,
        path,
        data,
        findExpressionNode(layoutRoot, path)?.scopeVariables,
        mode,
      );
      if (result === null) {
        return false;
      }
      onChange(result);
      return true;
    },
    [editable, expression, layoutRoot, mode, onChange],
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
  });

  // OS のクリップボードを使うコピー・切り取り・貼り付け (Ctrl/Cmd + C / X / V).
  // フォーカスのある要素に入力欄が無いとき copy / paste イベントは body に届くので, document で受けて
  // このツリーにフォーカスがあるときだけ選んだ式を扱う. clipboardData は権限の確認なしに読み書きできる.
  // 置換メニューの検索欄にフォーカスがあるときも, 文字を範囲選択していなければ選んだ式をコピーする
  // (式を押すとすぐ検索欄にフォーカスが移るため). 貼り付けは, definy の式なら入力欄ではなく選んだ式に貼り付ける
  useEffect(() => {
    const handleClipboard = (e: ClipboardEvent): void => {
      const container = containerRef.current;
      const active = document.activeElement;
      if (
        selectedPath === null ||
        container === null ||
        e.clipboardData === null ||
        !(active instanceof Node && container.contains(active))
      ) {
        return;
      }
      const inSearchInput =
        active instanceof HTMLInputElement &&
        active.classList.contains("dropdown-search-input");
      // 数値・文字列の入力欄に definy の式を貼り付けたときも, 文字ではなく式として貼り付ける
      if (e.type === "paste") {
        if (pasteAt(selectedPath, e.clipboardData.getData("text/plain"))) {
          e.preventDefault();
          if (isTextInput(active)) {
            keyboard.returnToTree();
          }
        }
        return;
      }
      if (isTextInput(active) && !inSearchInput) {
        return;
      }
      // 文字を範囲選択しているときはその文字をコピーさせる
      const hasTextSelection = inSearchInput
        ? active.selectionStart !== active.selectionEnd
        : !(document.getSelection()?.isCollapsed ?? true);
      if (hasTextSelection) {
        return;
      }
      const text = clipboardTextAt(selectedPath);
      if (text === null) {
        return;
      }
      e.preventDefault();
      e.clipboardData.setData("text/plain", text);
      if (e.type === "cut") {
        cutAt(selectedPath);
        if (inSearchInput) {
          keyboard.returnToTree();
        }
      }
    };
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("cut", handleClipboard);
    document.addEventListener("paste", handleClipboard);
    return () => {
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
    };
  }, [clipboardTextAt, cutAt, keyboard, pasteAt, selectedPath]);

  const applyOption = useCallback(
    (optionValue: string): void => {
      if (!selectedPath || !onChange) return;
      if (optionValue === GO_TO_DEFINITION) {
        const definition = findVariableDefinitionPath(expression, selectedPath);
        if (definition !== null) {
          keyboard.selectInTree(definition);
        }
        return;
      }
      if (isClipboardAction(optionValue)) {
        // 置換メニューから選んだときは非同期のクリップボード API を使う (貼り付けはブラウザが確認を出すことがある)
        const path = selectedPath;
        keyboard.returnToTree();
        if (optionValue === CLIPBOARD_COPY || optionValue === CLIPBOARD_CUT) {
          const text = clipboardTextAt(path);
          if (text === null) return;
          navigator.clipboard.writeText(text).then(
            () => {
              if (optionValue === CLIPBOARD_CUT) {
                cutAt(path);
              }
            },
            (e: unknown) => {
              console.error("failed to write the clipboard", e);
            },
          );
        } else {
          navigator.clipboard.readText().then(
            (text) => {
              pasteAt(path, text);
            },
            (e: unknown) => {
              console.error("failed to read the clipboard", e);
            },
          );
        }
        return;
      }
      if (isListAction(optionValue) || isLetAction(optionValue)) {
        const result = isListAction(optionValue)
          ? applyListAction(expression, selectedPath, optionValue)
          : applyLetAction(expression, selectedPath, optionValue);
        if (result !== null) {
          onChange(result.expression);
          keyboard.selectInTree(result.selectedPath);
        } else {
          keyboard.returnToTree();
        }
        return;
      }
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
      clipboardTextAt,
      cutAt,
      expression,
      keyboard,
      menu.currentOptionValue,
      onChange,
      parameterTypes,
      pasteAt,
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

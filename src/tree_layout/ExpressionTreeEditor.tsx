import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useId,
  type JSX,
} from "react";
import {
  computeLayout,
  expressionToLayoutNode,
  reuseUnchangedNodes,
} from "./engine.ts";
import {
  applySelection,
  clearExpressionAtPath,
  functionParameterTypes,
  partParameters,
  setNumberValue,
  setStringValue,
  variableParameters,
} from "./mutation.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { pathToString, type LayoutNode, type PathStep } from "./types.ts";
import { useDefiny } from "../state.tsx";
import { referenceViolation } from "../visibility.ts";
import { label, localizedText, withLanguage } from "../language.ts";
import { useRouter } from "@void/react";
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
  findNodeById,
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
import { isVariableNamePath, renameVariableAt } from "./local_variable.ts";
import {
  findDefinitionTarget,
  GO_TO_DEFINITION,
  type DefinitionTarget,
} from "./go_to_definition.ts";
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
import { callParameterNamesOf } from "./part_type.ts";
import {
  inferredTypeExpression,
  INFERRED_TYPE_ARGUMENT,
  typeArgumentHoles,
  typeAstText,
} from "./type_argument_inference.ts";
import { updateExpressionAtPath } from "./path.ts";
import { isVariant } from "../definy_value.ts";

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

  // 未入力の型引数の推論した型 (値のパス → core.type-ast). 式が変わったら推論し直す (下の useEffect)
  const [inferredTypeArguments, setInferredTypeArguments] = useState<{
    readonly expression: unknown;
    readonly types: ReadonlyMap<string, DefinyValue>;
  } | null>(null);
  const currentInferredTypeArguments = useMemo(
    () =>
      inferredTypeArguments !== null &&
      inferredTypeArguments.expression === expression
        ? inferredTypeArguments.types
        : new Map<string, DefinyValue>(),
    [inferredTypeArguments, expression],
  );
  const holeHints = useMemo(
    () =>
      new Map(
        [...currentInferredTypeArguments].map(([path, type]) => [
          path,
          typeAstText(type, partNames),
        ]),
      ),
    [currentInferredTypeArguments, partNames],
  );

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

  // 未入力の型引数を, ほかの引数の推論された型から推論する (docs/type-arguments.md「エディタ」).
  // 編集が少し止まってから型チェッカーに聞く
  useEffect(() => {
    if (mode === "type" || partType == null) {
      return;
    }
    // 調べる位置は式の全ノードのパス (推論した型を枠に出すとツリーが変わるので, 表示中のツリーは使わない)
    const holes = typeArgumentHoles(
      expression,
      collectNodeIndex(expressionToLayoutNode(expression)).map(
        (entry) => entry.path,
      ),
      (id) => partsByIdHash.get(id)?.partType,
    );
    if (holes.length === 0) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // 推論は型チェッカー (`core.type-infer-type-argument`) がする. 枠を probe にして推論した型引数を聞く
      (async () => {
        const types = new Map<string, DefinyValue>();
        for (const hole of holes) {
          const type = await findInferredTypeArgument({
            partType,
            expression: probeExpressionAt(expression, hole.path),
          });
          if (type !== null) {
            types.set(pathToString(hole.path), type);
          }
        }
        return types;
      })().then(
        (types) => {
          if (!cancelled) {
            setInferredTypeArguments({ expression, types });
          }
        },
        (e: unknown) => {
          console.error("failed to infer the type arguments", e);
        },
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expression, mode, partType, partsByIdHash, findInferredTypeArgument]);

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
  // 期待する型の問い合わせ (選んだ位置が変わるたびに作り直す). 型が届く前に選択肢を選んでも, 届くのを待ってから置き換える
  const expectedTypeRef = useRef<Promise<DefinyValue | null>>(
    Promise.resolve(null),
  );
  useEffect(() => {
    expectedTypeRef.current = Promise.resolve(null);
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
    const typePromise = findExpectedType({
      partType,
      expression: isPattern
        ? probeMatchTargetType(expression, selectedPath)
        : probeExpressionAt(expression, selectedPath),
    });
    if (!isPattern) {
      expectedTypeRef.current = typePromise.catch(() => null);
    }
    typePromise.then(
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
    expectsType: isVariant(expectedTypeAst, "type"),
    patternVariants,
    expectedVariants,
    setSelectedPath,
    setInlineEdit,
    inferredTypeArguments: holeHints,
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

  // Ctrl / Cmd を押している間は, ホバーしている名前が定義へ移動できるなら下線を引く (VSCode と同じ)
  const [modifierHeld, setModifierHeld] = useState(false);
  useEffect(() => {
    const update = (e: KeyboardEvent | MouseEvent): void => {
      setModifierHeld(e.ctrlKey || e.metaKey);
    };
    const release = (): void => {
      setModifierHeld(false);
    };
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("mousemove", update);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("mousemove", update);
      window.removeEventListener("blur", release);
    };
  }, []);
  const linkNodeId = useMemo(() => {
    if (!modifierHeld || hoveredId === null) {
      return null;
    }
    const node = findNodeById(layoutRoot, hoveredId);
    return node !== null &&
      node.children.length === 0 &&
      findDefinition(node.path) !== null
      ? hoveredId
      : null;
  }, [findDefinition, hoveredId, layoutRoot, modifierHeld]);

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
        if (!goToDefinition(selectedPath)) {
          keyboard.returnToTree();
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
      // 推論した型引数で確定する
      if (optionValue === INFERRED_TYPE_ARGUMENT) {
        const type = currentInferredTypeArguments.get(
          pathToString(selectedPath),
        );
        if (type !== undefined) {
          onChange(
            updateExpressionAtPath(expression, selectedPath, () =>
              inferredTypeExpression(
                type,
                findExpressionNode(layoutRoot, selectedPath)?.scopeVariables,
              ),
            ),
          );
        }
        keyboard.returnToTree();
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
        if (isMatchPatternPath(selectedPath)) {
          onChange(
            applyPatternSelection(
              expression,
              selectedPath,
              optionValue,
              patternVariants,
            ),
          );
        } else {
          // 関数の型を期待する位置ではラムダ式で包むので, 期待する型が届くのを待つ
          const path = selectedPath;
          void expectedTypeRef.current.then((type) => {
            onChange(
              applySelection(
                expression,
                path,
                optionValue,
                (hash) => {
                  const part = partsByIdHash.get(hash);
                  return part === undefined ? undefined : partParameters(part);
                },
                (variableId) =>
                  variableParameters(parameterTypes.get(variableId)),
                type,
              ),
            );
          });
        }
      }
      keyboard.returnToTree();
    },
    [
      clipboardTextAt,
      currentInferredTypeArguments,
      cutAt,
      expression,
      goToDefinition,
      layoutRoot,
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

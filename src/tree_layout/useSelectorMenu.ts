import { useCallback, useMemo, useState } from "react";
import type { PartSnapshot } from "../types.ts";
import type { LayoutNode, PathStep } from "./types.ts";
import type { ExpectedType } from "./type_inference.ts";
import { findExpressionNode } from "./selection.ts";
import {
  currentPatternOptionValue,
  isMatchPatternPath,
  isLiteralPatternVariants,
  literalPatternOption,
  patternSelectorOptions,
  type PatternVariant,
} from "./match_pattern.ts";
import {
  TYPE_SELECTOR_OPTIONS,
  buildSelectorOptions,
  filterAndRankOptions,
  highlightIndex,
  partSelectorOptions,
  resolveCurrentOptionValue,
  resolveHighlight,
  typePartSelectorOptions,
  type Highlight,
  type SelectorOption,
} from "./selector_options.ts";
import { goToDefinitionOption } from "./go_to_definition.ts";
import { isVariableNamePath } from "./local_variable.ts";
import { listItemSelectorOptions } from "./list_items.ts";
import { letBindingSelectorOptions } from "./let_bindings.ts";
import { clipboardSelectorOptions } from "./clipboard.ts";
import {
  typePartVariantOptions,
  unionVariantOptions,
  type expectedVariantsFromTypeAst,
} from "./variant.ts";

type ExpectedVariants = ReturnType<typeof expectedVariantsFromTypeAst>;

/** 値の式のエディタで書ける型の式の選択肢. `type` と `Code<T>` はパーツの型の行の中だけの式なので出さない */
const TYPE_EXPRESSION_SELECTOR_OPTIONS = TYPE_SELECTOR_OPTIONS.filter(
  (option) =>
    option.value !== "expr:type:type" && option.value !== "expr:type:code",
);

export type UseSelectorMenuParams = {
  readonly mode: "expression" | "type";
  readonly editable: boolean;
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly layoutRoot: LayoutNode;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  readonly expectedType: ExpectedType;
  /** 選んだ位置で型 (`type` 型の値. 型引数など) を期待するか. そうなら型の選択肢を先に出す */
  readonly expectsType?: boolean;
  /** 選んだ match のアームのパターンで選べるタグ (match の対象の型のタグ). 分からなければ `null` */
  readonly patternVariants: ReadonlyArray<PatternVariant> | null;
  /** 選んだ位置で期待する型から求めた Variant の選択肢の情報 ({@link expectedVariantsFromTypeAst}) */
  readonly expectedVariants: ExpectedVariants;
  readonly setSelectedPath: (path: ReadonlyArray<PathStep> | null) => void;
  readonly setInlineEdit: (inline: boolean) => void;
};

export type SelectorMenuState = {
  readonly isMenuOpen: boolean;
  readonly menuOpenCount: number;
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly setQueryEdited: (edited: boolean) => void;
  readonly chosenIndex: number | null;
  readonly setChosenIndex: (index: number | null) => void;
  readonly openMenu: (
    path: ReadonlyArray<PathStep>,
    initialQuery?: string,
  ) => void;
  readonly closeMenu: () => void;
  readonly currentName: string;
  readonly currentOptionValue: string | null;
  readonly filteredOptions: ReadonlyArray<SelectorOption>;
  readonly highlight: Highlight;
  readonly effectiveHighlightIndex: number | null;
};

export function useSelectorMenu({
  mode,
  editable,
  expression,
  selectedPath,
  layoutRoot,
  parts,
  partNames,
  expectedType,
  expectsType = false,
  patternVariants,
  expectedVariants,
  setSelectedPath,
  setInlineEdit,
}: UseSelectorMenuParams): SelectorMenuState {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpenCount, setMenuOpenCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [queryEdited, setQueryEdited] = useState(false);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const partOptions = useMemo(
    () =>
      mode === "type"
        ? typePartSelectorOptions(parts)
        : partSelectorOptions(parts),
    [parts, mode],
  );

  const variantOptions = useMemo(
    () =>
      mode === "type"
        ? []
        : [
            ...unionVariantOptions(expectedVariants.unionVariants),
            ...typePartVariantOptions(parts, expectedVariants.typePartIdHash),
          ],
    [expectedVariants, mode, parts],
  );

  const selectorOptionsAt = useCallback(
    (path: ReadonlyArray<PathStep>): ReadonlyArray<SelectorOption> => {
      if (isMatchPatternPath(path)) {
        return patternSelectorOptions({
          expression,
          patternPath: path,
          variants: patternVariants,
        });
      }
      const expressionNode = findExpressionNode(layoutRoot, path);
      const options = buildSelectorOptions({
        mode,
        scopeVariables: expressionNode?.scopeVariables,
        typeParameters: expressionNode?.typeParameters,
        partOptions,
        variantOptions,
      });
      // コピー・切り取り・貼り付けは, 式を置き換える選択肢より後に出す
      if (mode === "type") {
        return [...options, ...clipboardSelectorOptions()];
      }
      // 定義への移動・リストの要素の操作は, 式を置き換える選択肢より先に出す
      return [
        ...goToDefinitionOption(expression, path),
        ...listItemSelectorOptions(expression, path),
        ...letBindingSelectorOptions(expression, path),
        // 型引数の位置では型の式 (`number`, `List` など) を先に出す
        ...(expectsType ? TYPE_EXPRESSION_SELECTOR_OPTIONS : []),
        ...options,
        ...clipboardSelectorOptions(),
      ];
    },
    [
      expectsType,
      expression,
      layoutRoot,
      mode,
      partOptions,
      patternVariants,
      variantOptions,
    ],
  );

  const currentOptionValueAt = useCallback(
    (
      path: ReadonlyArray<PathStep>,
      options: ReadonlyArray<SelectorOption>,
    ): string | null =>
      isMatchPatternPath(path)
        ? currentPatternOptionValue(expression, path)
        : resolveCurrentOptionValue({
            expression,
            path,
            options,
            mode,
            partNames,
          }),
    [expression, mode, partNames],
  );

  const currentNameAt = useCallback(
    (path: ReadonlyArray<PathStep>): string => {
      const options = selectorOptionsAt(path);
      const value = currentOptionValueAt(path, options);
      return (
        options.find((o) => o.value === value)?.name ??
        findExpressionNode(layoutRoot, path)?.label ??
        ""
      );
    },
    [currentOptionValueAt, layoutRoot, selectorOptionsAt],
  );

  const openMenu = useCallback(
    (
      path: ReadonlyArray<PathStep>,
      initialQuery: string = currentNameAt(path),
    ): void => {
      setSelectedPath(path);
      setInlineEdit(true);
      // 関数の引数名・let や match で束縛する変数の名前はその場で名前を変えるだけで, 置き換える式の選択肢は無い
      if (!editable || isVariableNamePath(path)) {
        setIsMenuOpen(false);
        return;
      }
      setIsMenuOpen(true);
      setMenuOpenCount((n) => n + 1);
      setChosenIndex(null);
      setQueryEdited(false);
      setSearchQuery(initialQuery);
    },
    [currentNameAt, editable, setInlineEdit, setSelectedPath],
  );

  const closeMenu = useCallback((): void => {
    setIsMenuOpen(false);
    setSearchQuery("");
    setQueryEdited(false);
    setChosenIndex(null);
  }, []);

  const selectorOptions = useMemo(
    () => (selectedPath ? selectorOptionsAt(selectedPath) : []),
    [selectedPath, selectorOptionsAt],
  );

  const currentOptionValue = useMemo(
    () =>
      selectedPath ? currentOptionValueAt(selectedPath, selectorOptions) : null,
    [currentOptionValueAt, selectedPath, selectorOptions],
  );

  const currentName = useMemo(
    () => (selectedPath ? currentNameAt(selectedPath) : ""),
    [currentNameAt, selectedPath],
  );

  const filteredOptions = useMemo(() => {
    const query = queryEdited ? searchQuery : "";
    const filtered = filterAndRankOptions(selectorOptions, query, expectedType);
    // 文字列や数値の match のアームのパターンは, 打った文字列そのもの (リテラル) にできる
    const literal =
      selectedPath !== null &&
      isMatchPatternPath(selectedPath) &&
      isLiteralPatternVariants(patternVariants)
        ? literalPatternOption(query, patternVariants)
        : null;
    return literal === null ||
      filtered.some((option) => option.value === literal.value)
      ? filtered
      : [literal, ...filtered];
  }, [
    expectedType,
    patternVariants,
    queryEdited,
    searchQuery,
    selectedPath,
    selectorOptions,
  ]);

  const highlight = useMemo(
    () => resolveHighlight(chosenIndex, filteredOptions, currentOptionValue),
    [chosenIndex, currentOptionValue, filteredOptions],
  );

  const effectiveHighlightIndex = useMemo(
    () => highlightIndex(highlight),
    [highlight],
  );

  return {
    isMenuOpen,
    menuOpenCount,
    searchQuery,
    setSearchQuery,
    setQueryEdited,
    chosenIndex,
    setChosenIndex,
    openMenu,
    closeMenu,
    currentName,
    currentOptionValue,
    filteredOptions,
    highlight,
    effectiveHighlightIndex,
  };
}

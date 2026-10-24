import { useCallback, useMemo, useState } from "react";
import type { PartSnapshot } from "../types.ts";
import type { LayoutNode, PathStep } from "./types.ts";
import type { ExpectedType } from "./type_inference.ts";
import { findExpressionNode } from "./selection.ts";
import {
  currentPatternOptionValue,
  isMatchPatternPath,
  patternSelectorOptions,
  type PatternVariant,
} from "./match_pattern.ts";
import {
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
import { goToDefinitionOption, isVariableNamePath } from "./local_variable.ts";
import { listItemSelectorOptions } from "./list_items.ts";
import { letBindingSelectorOptions } from "./let_bindings.ts";
import {
  typePartVariantOptions,
  unionVariantOptions,
  type expectedVariantsFromTypeAst,
} from "./variant.ts";

type ExpectedVariants = ReturnType<typeof expectedVariantsFromTypeAst>;

export type UseSelectorMenuParams = {
  readonly mode: "expression" | "type";
  readonly editable: boolean;
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly layoutRoot: LayoutNode;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  readonly expectedType: ExpectedType;
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
      const scopeVariables = findExpressionNode(
        layoutRoot,
        path,
      )?.scopeVariables;
      const options = buildSelectorOptions({
        mode,
        scopeVariables,
        partOptions,
        variantOptions,
      });
      if (mode === "type") {
        return options;
      }
      // 定義への移動・リストの要素の操作は, 式を置き換える選択肢より先に出す
      return [
        ...goToDefinitionOption(expression, path),
        ...listItemSelectorOptions(expression, path),
        ...letBindingSelectorOptions(expression, path),
        ...options,
      ];
    },
    [
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

  const filteredOptions = useMemo(
    () =>
      filterAndRankOptions(
        selectorOptions,
        queryEdited ? searchQuery : "",
        expectedType,
      ),
    [expectedType, queryEdited, searchQuery, selectorOptions],
  );

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

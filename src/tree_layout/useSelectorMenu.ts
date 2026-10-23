import { useCallback, useMemo, useState } from "react";
import type { PartSnapshot } from "../types.ts";
import type { LayoutNode, PathStep } from "./types.ts";
import type { ExpectedType } from "./type_inference.ts";
import { findExpressionNode } from "./selection.ts";
import { functionParameterIndex } from "./mutation.ts";
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

export type UseSelectorMenuParams = {
  readonly mode: "expression" | "type";
  readonly editable: boolean;
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly layoutRoot: LayoutNode;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  readonly expectedType: ExpectedType;
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

  const selectorOptionsAt = useCallback(
    (path: ReadonlyArray<PathStep>): ReadonlyArray<SelectorOption> => {
      const scopeVariables = findExpressionNode(
        layoutRoot,
        path,
      )?.scopeVariables;
      return buildSelectorOptions({ mode, scopeVariables, partOptions });
    },
    [layoutRoot, mode, partOptions],
  );

  const currentOptionValueAt = useCallback(
    (
      path: ReadonlyArray<PathStep>,
      options: ReadonlyArray<SelectorOption>,
    ): string | null =>
      resolveCurrentOptionValue({
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
      // 関数の引数名はその場で名前を変えるだけで, 置き換える式の選択肢は無い
      if (!editable || functionParameterIndex(path) !== null) {
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

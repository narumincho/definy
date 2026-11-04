import { useCallback, useEffect, type RefObject } from "react";
import {
  expressionToClipboardText,
  parseClipboardText,
  pasteExpressionAt,
} from "./clipboard.ts";
import { isTextInput } from "./keyboard.ts";
import { isVariableNamePath } from "./local_variable.ts";
import { isMatchPatternPath } from "./match_pattern.ts";
import { clearExpressionAtPath } from "./mutation.ts";
import { findExpressionNode } from "./selection.ts";
import type { LayoutNode, PathStep } from "./types.ts";

/** 選んだ式のコピー・切り取り・貼り付け */
export type ExpressionClipboard = {
  /** 選んだ式をクリップボードに書く JSON 文字列. 式でない位置なら `null` */
  readonly clipboardTextAt: (path: ReadonlyArray<PathStep>) => string | null;
  /** 選んだ式を切り取る (未入力にする) */
  readonly cutAt: (path: ReadonlyArray<PathStep>) => void;
  /** クリップボードの文字列を選んだ式に貼り付ける. definy の式でなければ何もせず `false` */
  readonly pasteAt: (path: ReadonlyArray<PathStep>, text: string) => boolean;
};

/**
 * 式のツリーのクリップボード操作. OS のクリップボードを使うコピー・切り取り・貼り付け (Ctrl/Cmd + C / X / V) も受ける.
 *
 * フォーカスのある要素に入力欄が無いとき copy / paste イベントは body に届くので, document で受けて
 * このツリーにフォーカスがあるときだけ選んだ式を扱う. clipboardData は権限の確認なしに読み書きできる.
 * 置換メニューの検索欄にフォーカスがあるときも, 文字を範囲選択していなければ選んだ式をコピーする
 * (式を押すとすぐ検索欄にフォーカスが移るため). 貼り付けは, definy の式なら入力欄ではなく選んだ式に貼り付ける
 */
export function useExpressionClipboard({
  containerRef,
  expression,
  layoutRoot,
  mode,
  editable,
  onChange,
  selectedPath,
  returnToTree,
}: {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly expression: unknown;
  readonly layoutRoot: LayoutNode;
  readonly mode: "expression" | "type";
  readonly editable: boolean;
  readonly onChange: ((newExpression: unknown) => void) | undefined;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  /** 入力欄からツリーにフォーカスを戻す */
  readonly returnToTree: () => void;
}): ExpressionClipboard {
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

  const cutAt = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      if (onChange && editable) {
        onChange(clearExpressionAtPath(expression, path));
      }
    },
    [editable, expression, onChange],
  );

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
            returnToTree();
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
          returnToTree();
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
  }, [
    clipboardTextAt,
    containerRef,
    cutAt,
    pasteAt,
    returnToTree,
    selectedPath,
  ]);

  return { clipboardTextAt, cutAt, pasteAt };
}

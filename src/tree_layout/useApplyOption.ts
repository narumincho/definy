import { useCallback, type RefObject } from "react";
import type { DefinyValue } from "../stage1_compiler.ts";
import type { PartSnapshot } from "../types.ts";
import {
  CLIPBOARD_COPY,
  CLIPBOARD_CUT,
  isClipboardAction,
} from "./clipboard.ts";
import {
  applyParameterAction,
  isParameterAction,
} from "./function_parameters.ts";
import { GO_TO_DEFINITION } from "./go_to_definition.ts";
import { applyLetAction, isLetAction } from "./let_bindings.ts";
import { applyListAction, isListAction } from "./list_items.ts";
import {
  applyPatternSelection,
  isMatchPatternPath,
  type PatternVariant,
} from "./match_pattern.ts";
import {
  applySelection,
  partParameters,
  variableParameters,
  type functionParameterTypes,
} from "./mutation.ts";
import { updateExpressionAtPath } from "./path.ts";
import { applyRecordAction, isRecordAction } from "./record_fields.ts";
import { findExpressionNode } from "./selection.ts";
import {
  inferredTypeExpression,
  INFERRED_TYPE_ARGUMENT,
} from "./type_argument_inference.ts";
import { pathToString, type LayoutNode, type PathStep } from "./types.ts";
import type { ExpressionClipboard } from "./useExpressionClipboard.ts";

/**
 * 置換メニューで選んだ選択肢 (`optionValue`) を選んだ式に当てはめる関数.
 * 定義へ移動・クリップボード・推論した型引数・リスト / let / 引数 / レコードの操作・パターン・式の置き換えを振り分ける
 */
export function useApplyOption({
  selectedPath,
  onChange,
  expression,
  layoutRoot,
  currentOptionValue,
  patternVariants,
  expectedTypeRef,
  inferredTypeArguments,
  partsByIdHash,
  parameterTypes,
  clipboard,
  goToDefinition,
  returnToTree,
  selectInTree,
}: {
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly onChange: ((newExpression: unknown) => void) | undefined;
  readonly expression: unknown;
  readonly layoutRoot: LayoutNode;
  /** 選んだ式の今の選択肢. 同じものを選び直しても式を作り直さない */
  readonly currentOptionValue: string | null;
  readonly patternVariants: ReadonlyArray<PatternVariant> | null;
  /** 期待する型の問い合わせ (`useExpectedType`) */
  readonly expectedTypeRef: RefObject<Promise<DefinyValue | null>>;
  /** 推論した型引数 (値のパス → 型) */
  readonly inferredTypeArguments: ReadonlyMap<string, DefinyValue>;
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly parameterTypes: ReturnType<typeof functionParameterTypes>;
  readonly clipboard: ExpressionClipboard;
  readonly goToDefinition: (path: ReadonlyArray<PathStep>) => boolean;
  readonly returnToTree: () => void;
  readonly selectInTree: (path: ReadonlyArray<PathStep>) => void;
}): (optionValue: string) => void {
  const { clipboardTextAt, cutAt, pasteAt } = clipboard;
  return useCallback(
    (optionValue: string): void => {
      if (!selectedPath || !onChange) return;
      if (optionValue === GO_TO_DEFINITION) {
        if (!goToDefinition(selectedPath)) {
          returnToTree();
        }
        return;
      }
      if (isClipboardAction(optionValue)) {
        // 置換メニューから選んだときは非同期のクリップボード API を使う (貼り付けはブラウザが確認を出すことがある)
        const path = selectedPath;
        returnToTree();
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
        const type = inferredTypeArguments.get(pathToString(selectedPath));
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
        returnToTree();
        return;
      }
      if (
        isListAction(optionValue) ||
        isLetAction(optionValue) ||
        isParameterAction(optionValue) ||
        isRecordAction(optionValue)
      ) {
        const result = isListAction(optionValue)
          ? applyListAction(expression, selectedPath, optionValue)
          : isLetAction(optionValue)
            ? applyLetAction(expression, selectedPath, optionValue)
            : isParameterAction(optionValue)
              ? applyParameterAction(expression, selectedPath, optionValue)
              : applyRecordAction(expression, selectedPath, optionValue);
        if (result !== null) {
          onChange(result.expression);
          selectInTree(result.selectedPath);
        } else {
          returnToTree();
        }
        return;
      }
      // 現在と同じ選択肢を選び直しても式を作り直さない (中身が初期値に戻ってしまうため)
      if (optionValue !== currentOptionValue) {
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
      returnToTree();
    },
    [
      clipboardTextAt,
      currentOptionValue,
      cutAt,
      expectedTypeRef,
      expression,
      goToDefinition,
      inferredTypeArguments,
      layoutRoot,
      onChange,
      parameterTypes,
      pasteAt,
      partsByIdHash,
      patternVariants,
      returnToTree,
      selectInTree,
      selectedPath,
    ],
  );
}

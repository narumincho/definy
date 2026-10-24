/**
 * リスト (`list`) の要素の追加・削除・並び替え.
 * 要素を選んだとき (またはリストそのものを選んだとき) の置換メニューに操作の選択肢を出す
 */
import type { SelectorOption } from "./selector_options.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import type { PathStep } from "./types.ts";
import { variant, variantPayload } from "../definy_value.ts";
import { hole } from "./expression.ts";

/** 置換メニューの選択肢の value */
export const LIST_APPEND_ITEM = "list:append";
export const LIST_INSERT_BEFORE = "list:insert-before";
export const LIST_INSERT_AFTER = "list:insert-after";
export const LIST_MOVE_EARLIER = "list:move-earlier";
export const LIST_MOVE_LATER = "list:move-later";
export const LIST_DELETE_ITEM = "list:delete";

function listItemsAt(
  expr: unknown,
  listPath: ReadonlyArray<PathStep>,
): ReadonlyArray<unknown> | null {
  const items = variantPayload(getExpressionAtPath(expr, listPath), "list");
  return Array.isArray(items) ? items : null;
}

/** `path` の最後がリストの要素 (`listItemValue`) で, その親がリストなら, 要素の番号と要素の数 */
function listItemAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): { readonly index: number; readonly length: number } | null {
  const last = path[path.length - 1];
  if (typeof last !== "object" || last.kind !== "listItemValue") {
    return null;
  }
  const items = listItemsAt(expr, path.slice(0, -1));
  return items === null || last.index >= items.length
    ? null
    : { index: last.index, length: items.length };
}

const action = (
  value: string,
  name: string,
  detail?: string,
): SelectorOption => ({
  value,
  name,
  detail,
  category: "List",
  returnType: "any",
});

/**
 * リストの操作の選択肢. リストそのものなら末尾に要素を足す,
 * リストの要素なら前後に要素を足す・前後へ動かす・消す
 */
export function listItemSelectorOptions(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  const item = listItemAt(expr, path);
  const ownItems = listItemsAt(expr, path);
  return [
    ...(ownItems !== null
      ? [action(LIST_APPEND_ITEM, "add-item", `[..., □]`)]
      : []),
    ...(item === null
      ? []
      : [
          action(LIST_INSERT_BEFORE, "insert-item-before", "[□, this]"),
          action(LIST_INSERT_AFTER, "insert-item-after", "[this, □]"),
          ...(item.index > 0
            ? [action(LIST_MOVE_EARLIER, "move-item-earlier", "←")]
            : []),
          ...(item.index < item.length - 1
            ? [action(LIST_MOVE_LATER, "move-item-later", "→")]
            : []),
          action(LIST_DELETE_ITEM, "delete-item"),
        ]),
  ];
}

export function isListAction(value: string): boolean {
  return value.startsWith("list:");
}

function updateListAt(
  expr: unknown,
  listPath: ReadonlyArray<PathStep>,
  updater: (items: ReadonlyArray<unknown>) => ReadonlyArray<unknown>,
): unknown {
  return updateExpressionAtPath(expr, listPath, (node) => {
    const items = variantPayload(node, "list");
    return Array.isArray(items) ? variant("list", updater(items)) : node;
  });
}

const HOLE = hole();

/**
 * リストの操作 ({@link listItemSelectorOptions}) を適用する.
 * 操作した後に選ぶ位置 (足した要素・動かした要素・消した要素の隣かリスト) も返す. 適用できなければ `null`
 */
export function applyListAction(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): {
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep>;
} | null {
  const itemPath = (listPath: ReadonlyArray<PathStep>, index: number) => [
    ...listPath,
    { kind: "listItemValue" as const, index },
  ];
  if (value === LIST_APPEND_ITEM) {
    const items = listItemsAt(expr, path);
    if (items === null) {
      return null;
    }
    return {
      expression: updateListAt(expr, path, (current) => [...current, HOLE]),
      selectedPath: itemPath(path, items.length),
    };
  }
  const item = listItemAt(expr, path);
  if (item === null) {
    return null;
  }
  const listPath = path.slice(0, -1);
  const { index, length } = item;
  switch (value) {
    case LIST_INSERT_BEFORE:
      return {
        expression: updateListAt(expr, listPath, (items) => [
          ...items.slice(0, index),
          HOLE,
          ...items.slice(index),
        ]),
        selectedPath: itemPath(listPath, index),
      };
    case LIST_INSERT_AFTER:
      return {
        expression: updateListAt(expr, listPath, (items) => [
          ...items.slice(0, index + 1),
          HOLE,
          ...items.slice(index + 1),
        ]),
        selectedPath: itemPath(listPath, index + 1),
      };
    case LIST_MOVE_EARLIER:
    case LIST_MOVE_LATER: {
      const to = value === LIST_MOVE_EARLIER ? index - 1 : index + 1;
      if (to < 0 || to >= length) {
        return null;
      }
      return {
        expression: updateListAt(expr, listPath, (items) =>
          items.map((current, i) =>
            i === index ? items[to] : i === to ? items[index] : current,
          ),
        ),
        selectedPath: itemPath(listPath, to),
      };
    }
    case LIST_DELETE_ITEM:
      return {
        expression: updateListAt(expr, listPath, (items) =>
          items.filter((_, i) => i !== index),
        ),
        // 消した要素の位置に次の要素が来る. 最後の要素を消したら前の要素, 空になったらリスト
        selectedPath:
          length === 1
            ? listPath
            : itemPath(listPath, Math.min(index, length - 2)),
      };
    default:
      return null;
  }
}

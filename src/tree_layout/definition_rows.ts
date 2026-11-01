/**
 * パーツ定義のツリー (PartDefinitionTree) の行の間のキーボード移動 (docs/key.md).
 *
 * ```text
 * part <名前>   ← 見出し (ルート)
 *   module
 *   doc
 *   type
 *   value       ← 式のツリーエディタ
 * ```
 *
 * 定義の式で表示しているとき (docs/part-definition.md) は doc / type / value の代わりに definition の 1 行
 */
import type { NavKey } from "./keyboard.ts";

export type DefinitionRow =
  "name" | "module" | "description" | "type" | "value" | "definition";

/** パーツ定義のツリーの表示: 項目ごと (説明・型・式) か, 定義の式 1 つか */
export type DefinitionView = "fields" | "definition";

const DEFINITION_ROWS: ReadonlyArray<DefinitionRow> = [
  "name",
  "module",
  "description",
  "type",
  "value",
];

/** 定義の式で表示しているときの行 */
const DEFINITION_EXPRESSION_ROWS: ReadonlyArray<DefinitionRow> = [
  "name",
  "module",
  "definition",
];

/** 表示の行 */
export function definitionRowsOf(
  view: DefinitionView,
): ReadonlyArray<DefinitionRow> {
  return view === "definition" ? DEFINITION_EXPRESSION_ROWS : DEFINITION_ROWS;
}

/** 行の間の移動先. 式のツリーの中へ入る E は呼び出し側で扱う */
export function nextRow(
  current: DefinitionRow | null,
  key: NavKey,
  rows: ReadonlyArray<DefinitionRow> = DEFINITION_ROWS,
): DefinitionRow | null {
  if (current === null || !rows.includes(current)) {
    return "name";
  }
  const index = rows.indexOf(current);
  switch (key) {
    case "up":
      return rows[index - 1] ?? null;
    case "down":
      return rows[index + 1] ?? null;
    case "parent":
    case "root":
      return current === "name" ? null : "name";
    case "firstChild":
      return current === "name" ? (rows[1] ?? null) : null;
    case "lastChild":
      return current === "name" ? (rows.at(-1) ?? null) : null;
    case "left":
    case "right":
      return null;
  }
}

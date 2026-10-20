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
 */
import type { NavKey } from "./keyboard.ts";

export type DefinitionRow =
  "name" | "module" | "description" | "type" | "value";

export const DEFINITION_ROWS: ReadonlyArray<DefinitionRow> = [
  "name",
  "module",
  "description",
  "type",
  "value",
];

/** 行の間の移動先. 式のツリーの中へ入る E は呼び出し側で扱う */
export function nextRow(
  current: DefinitionRow | null,
  key: NavKey,
): DefinitionRow | null {
  if (current === null) {
    return "name";
  }
  const index = DEFINITION_ROWS.indexOf(current);
  switch (key) {
    case "up":
      return DEFINITION_ROWS[index - 1] ?? null;
    case "down":
      return DEFINITION_ROWS[index + 1] ?? null;
    case "parent":
    case "root":
      return current === "name" ? null : "name";
    case "firstChild":
      return current === "name" ? "module" : null;
    case "lastChild":
      return current === "name" ? "value" : null;
    case "left":
    case "right":
      return null;
  }
}

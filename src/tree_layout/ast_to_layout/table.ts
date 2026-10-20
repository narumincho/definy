import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";

export function tryBuildTable(
  items: ReadonlyArray<unknown>,
  idPrefix: string,
  basePath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
  if (items.length < 2) return null;

  const allKeys: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    const inner = (rec.TypeLiteral ?? rec.RecordLiteral) as
      | {
          items?: ReadonlyArray<{ key?: unknown; name?: unknown }>;
        }
      | undefined;
    if (!inner || !Array.isArray(inner.items) || inner.items.length === 0) {
      return null;
    }
    for (const f of inner.items) {
      const k = String(f.key ?? f.name ?? "");
      if (!allKeys.includes(k)) {
        allKeys.push(k);
      }
    }
  }

  if (allKeys.length === 0) return null;

  const rows: ReadonlyArray<LayoutNode> = items.map((item, rowIdx) => {
    const rec =
      (item as Record<string, unknown>).TypeLiteral ??
      (item as Record<string, unknown>).RecordLiteral;
    const fields =
      (rec as { items?: ReadonlyArray<Record<string, unknown>> }).items ?? [];
    const rowCells: ReadonlyArray<LayoutNode> = allKeys.map((key, colIdx) => {
      const fieldIdx = fields.findIndex(
        (f) => String(f.key ?? f.name ?? "") === key,
      );
      if (fieldIdx >= 0) {
        const field = fields[fieldIdx];
        const cellPath = childPath(
          childPath(basePath, { kind: "listItemValue", index: rowIdx }),
          { kind: "recordItemValue", index: fieldIdx },
        );
        return buildLayoutNode(
          field?.value,
          `${idPrefix}.r${rowIdx}.c${colIdx}`,
          cellPath,
          context,
        );
      }
      return {
        id: `${idPrefix}.r${rowIdx}.c${colIdx}.none`,
        path: childPath(basePath, { kind: "listItemValue", index: rowIdx }),
        label: "-",
        kind: "delimiter",
        children: [],
        computedWidth: 20,
        computedHeight: 26,
        layoutMode: "inline",
      };
    });

    return {
      id: `${idPrefix}.row_${rowIdx}`,
      path: childPath(basePath, { kind: "listItemValue", index: rowIdx }),
      label: `row ${rowIdx + 1}`,
      kind: "group",
      children: rowCells,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  });

  return {
    id: idPrefix,
    path: basePath,
    label: "table",
    kind: "table",
    children: rows,
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "multiline",
    tableHeaders: allKeys,
  };
}

import type { LayoutNode, PathStep } from "../types.ts";
import { variantPayload } from "../../definy_value.ts";
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
    const fields = variantPayload(item, "record");
    if (!Array.isArray(fields) || fields.length === 0) {
      return null;
    }
    for (const f of fields as ReadonlyArray<{ readonly key?: unknown }>) {
      const k = String(f.key ?? "");
      if (!allKeys.includes(k)) {
        allKeys.push(k);
      }
    }
  }

  if (allKeys.length === 0) return null;

  const rows: ReadonlyArray<LayoutNode> = items.map((item, rowIdx) => {
    const fields = variantPayload(item, "record") as ReadonlyArray<
      Readonly<Record<string, unknown>>
    >;
    const rowCells: ReadonlyArray<LayoutNode> = allKeys.map((key, colIdx) => {
      const fieldIdx = fields.findIndex((f) => String(f.key ?? "") === key);
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

import type { LayoutMode, LayoutNode, LayoutOptions } from "./types.ts";
import { DEFAULT_LAYOUT_OPTIONS } from "./types.ts";
import { expressionToLayoutNode, type ScopeContext } from "./ast_to_layout.ts";

export { expressionToLayoutNode, type ScopeContext };

export function estimateTextWidth(text: string, charWidth: number): number {
  let count = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    count += code > 255 ? 2 : 1;
  }
  return count * charWidth;
}

export function computeLayout(
  root: LayoutNode,
  options: Partial<LayoutOptions> = {},
): LayoutNode {
  const fullOptions: LayoutOptions = {
    ...DEFAULT_LAYOUT_OPTIONS,
    ...options,
  };
  return layoutRecursive(root, fullOptions.maxWidth, fullOptions, 0);
}

function layoutRecursive(
  node: LayoutNode,
  availableWidth: number,
  options: LayoutOptions,
  depth: number,
): LayoutNode {
  const labelWidth =
    estimateTextWidth(node.label, options.charWidth) +
    options.chipPaddingX * 2.0;

  if (node.children.length === 0) {
    return {
      ...node,
      computedWidth: Math.max(labelWidth, 20),
      computedHeight: options.lineHeight,
      layoutMode: "inline",
    };
  }

  if (node.kind === "table") {
    return layoutTableNode(node, availableWidth, options, depth);
  }

  const totalInlineWidth = estimateInlineWidth(node, options);
  const canFitInline =
    totalInlineWidth <= availableWidth - 4.0 && node.kind !== "block";

  if (canFitInline) {
    const updatedChildren = node.children.map((child) =>
      layoutRecursive(child, availableWidth, options, depth + 1),
    );
    return {
      ...node,
      layoutMode: "inline",
      computedWidth: totalInlineWidth,
      computedHeight: options.lineHeight,
      children: updatedChildren,
    };
  }

  // Multiline layout
  const childAvailableWidth = Math.max(
    availableWidth - options.indentSize,
    100,
  );
  let maxChildWidth = 0;
  let totalChildrenHeight = 0;

  const updatedChildren = node.children.map((child) => {
    const computedChild = layoutRecursive(
      child,
      childAvailableWidth,
      options,
      depth + 1,
    );
    maxChildWidth = Math.max(maxChildWidth, computedChild.computedWidth);
    totalChildrenHeight += computedChild.computedHeight + 4.0;
    return computedChild;
  });

  return {
    ...node,
    layoutMode: "multiline",
    computedWidth: Math.max(
      labelWidth + 10.0,
      maxChildWidth + options.indentSize,
    ),
    computedHeight: options.lineHeight + totalChildrenHeight + 6.0,
    children: updatedChildren,
  };
}

function estimateInlineWidth(node: LayoutNode, options: LayoutOptions): number {
  const labelW =
    estimateTextWidth(node.label, options.charWidth) +
    options.chipPaddingX * 2.0;
  if (node.children.length === 0) {
    return Math.max(labelW, 20);
  }
  let sum = labelW + 16.0;
  for (const child of node.children) {
    sum += estimateInlineWidth(child, options) + 5.0;
  }
  return sum;
}

function layoutTableNode(
  node: LayoutNode,
  availableWidth: number,
  options: LayoutOptions,
  depth: number,
): LayoutNode {
  const headers = node.tableHeaders ?? [];
  const numColumns = headers.length;
  if (numColumns === 0) {
    return {
      ...node,
      computedWidth: 100,
      computedHeight: options.lineHeight,
    };
  }

  const colWidths: ReadonlyArray<number> = headers.map((h, colIdx) => {
    const headerWidth = estimateTextWidth(h, options.charWidth) + 16.0;
    const maxCellWidth = node.children.reduce((maxW, row) => {
      const cell = row.children[colIdx];
      if (!cell) return maxW;
      const cellW = estimateInlineWidth(cell, options) + 12.0;
      return Math.max(maxW, cellW);
    }, headerWidth);
    return Math.max(maxCellWidth, 60.0);
  });

  const tableWidth =
    colWidths.reduce((a, b) => a + b, 0) + numColumns * 8.0 + 16.0;
  const rowHeight = options.lineHeight + 8.0;
  const headerHeight = options.lineHeight + 4.0;
  const totalRowsHeight = headerHeight + node.children.length * rowHeight;

  const updatedRows = node.children.map((row) => {
    const updatedCells = row.children.map((cell, colIdx) => {
      const colW = colWidths[colIdx] ?? 80.0;
      return layoutRecursive(cell, colW, options, depth + 1);
    });
    return {
      ...row,
      computedHeight: rowHeight,
      computedWidth: tableWidth,
      layoutMode: "inline" as LayoutMode,
      children: updatedCells,
    };
  });

  return {
    ...node,
    layoutMode: "multiline",
    columnsWidth: colWidths,
    computedWidth: Math.min(tableWidth, Math.max(availableWidth, tableWidth)),
    computedHeight: totalRowsHeight + 12.0,
    children: updatedRows,
  };
}

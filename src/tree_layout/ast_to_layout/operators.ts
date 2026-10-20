import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";

const BINARY_OPS: ReadonlyArray<{
  readonly key: string;
  readonly op: string;
}> = [
  { key: "Add", op: "plus" },
  { key: "Subtract", op: "minus" },
  { key: "Multiply", op: "multiply" },
  { key: "Divide", op: "divide" },
  { key: "Remainder", op: "remainder" },
  { key: "Equal", op: "equal" },
  { key: "NotEqual", op: "not-equal" },
  { key: "LessThan", op: "less-than" },
  { key: "LessThanOrEqual", op: "less-than-or-equal" },
  { key: "GreaterThan", op: "greater-than" },
  { key: "GreaterThanOrEqual", op: "greater-than-or-equal" },
  { key: "And", op: "and" },
  { key: "Or", op: "or" },
  { key: "StringConcat", op: "string-concat" },
  { key: "ListConcat", op: "list-concat" },
  { key: "BitAnd", op: "bit-and" },
  { key: "BitOr", op: "bit-or" },
  { key: "BitXor", op: "bit-xor" },
  { key: "ShiftLeft", op: "shift-left" },
  { key: "ShiftRight", op: "shift-right" },
];

export function tryBuildOperatorNode(
  node: Record<string, unknown>,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
  for (const { key, op } of BINARY_OPS) {
    if (key in node) {
      const inner = node[key] as { left?: unknown; right?: unknown };
      const leftChild = buildLayoutNode(
        inner?.left,
        `${idPrefix}.left`,
        childPath(currentPath, "left"),
        context,
      );
      const rightChild = buildLayoutNode(
        inner?.right,
        `${idPrefix}.right`,
        childPath(currentPath, "right"),
        context,
      );
      return {
        id: idPrefix,
        path: currentPath,
        label: op,
        kind: "operator",
        children: [leftChild, rightChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
    }
  }

  if ("Not" in node) {
    const inner = (node.Not as { value?: unknown })?.value;
    const child = buildLayoutNode(
      inner,
      `${idPrefix}.val`,
      childPath(currentPath, "condition"),
      context,
    );
    return {
      id: idPrefix,
      path: currentPath,
      label: "not",
      kind: "operator",
      children: [child],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  return null;
}

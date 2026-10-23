import type { LayoutNode, PathStep } from "./types.ts";
import type { ScopeContext } from "./ast_to_layout/types.ts";
import { tryBuildLiteralNode } from "./ast_to_layout/literals.ts";
import { tryBuildFunctionNode } from "./ast_to_layout/functions.ts";
import { tryBuildCollectionNode } from "./ast_to_layout/collections.ts";
import { tryBuildControlOrTypeNode } from "./ast_to_layout/control_and_types.ts";

export type { ScopeContext };

export function expressionToLayoutNode(
  expr: unknown,
  idPrefix = "root",
  context: ScopeContext = {},
  currentPath: ReadonlyArray<PathStep> = [],
): LayoutNode {
  return buildLayoutNode(expr, idPrefix, currentPath, context);
}

/**
 * 式 1 つ分のノードを作り, その位置から参照できる変数 (`scopeVariables`) を付ける.
 * let の束縛の Map はあとから変数が足されるので複製しておく
 */
function buildLayoutNode(
  expr: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
): LayoutNode {
  return {
    ...buildExpressionLayoutNode(expr, idPrefix, currentPath, context),
    scopeVariables: new Map(context.scopeVariables ?? []),
  };
}

function buildExpressionLayoutNode(
  expr: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
): LayoutNode {
  const literalNode = tryBuildLiteralNode(expr, idPrefix, currentPath, context);
  if (literalNode !== null) {
    return literalNode;
  }

  const node = expr as Record<string, unknown>;

  const functionNode = tryBuildFunctionNode(
    node,
    idPrefix,
    currentPath,
    context,
    buildLayoutNode,
  );
  if (functionNode !== null) {
    return functionNode;
  }

  const collectionNode = tryBuildCollectionNode(
    node,
    idPrefix,
    currentPath,
    context,
    buildLayoutNode,
  );
  if (collectionNode !== null) {
    return collectionNode;
  }

  const controlOrTypeNode = tryBuildControlOrTypeNode(
    node,
    idPrefix,
    currentPath,
    context,
    buildLayoutNode,
  );
  if (controlOrTypeNode !== null) {
    return controlOrTypeNode;
  }

  // Fallback for unknown object variants
  const firstKey = Object.keys(node)[0] ?? "unknown";
  return {
    id: idPrefix,
    path: currentPath,
    label: firstKey,
    kind: "keyword",
    children: [],
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "inline",
  };
}

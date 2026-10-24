import { getExpressionAtPath } from "./path.ts";
import { callOf, partReferenceIdOf, variableIdOf } from "./expression.ts";
import { findExpressionNode } from "./selection.ts";
import type { LayoutNode, PathStep } from "./types.ts";

/** ホバーしたノードを含む式 (式 1 つ分のノード) */
export type HoverTarget = {
  /** 式 1 つ分のノードの ID. ホバーの表示をこのノードの下に出す */
  readonly nodeId: string;
  readonly path: ReadonlyArray<PathStep>;
  /** 式が変数ならその名前 */
  readonly variableName: string | null;
  /** 式がパーツの参照・パーツの呼び出しなら, そのパーツの ID (URL-safe Base64) */
  readonly partIdHash: string | null;
};

/**
 * ホバーしたノード (`hoveredId`) を含む, いちばん内側の式を探す.
 * 記号 (`=` など)・関数の引数名・match のパターンのような式でないノードは, それを含む式にする
 */
export function findHoverTarget(
  layoutRoot: LayoutNode,
  expression: unknown,
  hoveredId: string,
): HoverTarget | null {
  const expressionNode = findEnclosingExpressionNode(
    layoutRoot,
    hoveredId,
    null,
  );
  if (expressionNode === null) {
    return null;
  }
  const target = getExpressionAtPath(expression, expressionNode.path);
  return {
    nodeId: expressionNode.id,
    path: expressionNode.path,
    variableName: variableNameOf(target, expressionNode.scopeVariables),
    partIdHash: referencedPartIdHash(target),
  };
}

function findEnclosingExpressionNode(
  node: LayoutNode,
  hoveredId: string,
  enclosing: LayoutNode | null,
): LayoutNode | null {
  const current = node.scopeVariables !== undefined ? node : enclosing;
  if (node.id === hoveredId) {
    // 呼び出しの引数名 (`x:`) は, 同じパスの引数の式
    return findExpressionNode(node, node.path) ?? current;
  }
  for (const child of node.children) {
    const found = findEnclosingExpressionNode(child, hoveredId, current);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function variableNameOf(
  target: unknown,
  scopeVariables: ReadonlyMap<number, string> | undefined,
): string | null {
  const id = variableIdOf(target);
  if (id === null) {
    return null;
  }
  return scopeVariables?.get(id) ?? `var_${id}`;
}

/** パーツの参照 (型の式の型パーツの参照も) か, パーツの呼び出しなら, そのパーツの ID */
export function referencedPartIdHash(target: unknown): string | null {
  const call = callOf(target);
  if (call !== undefined) {
    return referencedPartIdHash(call.callee);
  }
  return partReferenceIdOf(target);
}

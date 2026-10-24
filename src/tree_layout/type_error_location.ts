import type { LayoutNode, PathStep } from "./types.ts";
import { getExpressionAtPath } from "./mutation.ts";
import { field, variantOf, variantPayload } from "../definy_value.ts";
import type { DefinyValue } from "../stage1_compiler.ts";

/** 比べるための文字列. レコードのキーの順番によらない */
function canonicalKey(value: unknown): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalKey).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as { readonly [key: string]: unknown };
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalKey(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * 式と, エディタで同じ 1 つのノードに見せている式. 続けて書いた let は 1 つのブロックなので,
 * 2 つ目以降の束縛の let もブロックのノードの式とみなす
 */
function expressionsOfNode(expression: unknown): ReadonlyArray<unknown> {
  const lets: unknown[] = [expression];
  let current = expression;
  while (variantOf(current)?.tag === "let") {
    current = field(variantPayload(current, "let"), "body");
    if (variantOf(current)?.tag === "let") {
      lets.push(current);
    }
  }
  return lets;
}

/**
 * 型チェッカーがエラーを見つけた式 (`core.type-error` の `located` の `expression`) を表すノードのパス.
 * 同じ式が何か所にもあるときは表示順で最初のもの. 見つからなければ `null`
 */
export function findTypeErrorPath(
  layoutRoot: LayoutNode,
  expression: unknown,
  errorExpression: DefinyValue,
): ReadonlyArray<PathStep> | null {
  const target = canonicalKey(errorExpression);
  const targetTag = variantOf(errorExpression)?.tag;
  if (targetTag === undefined) {
    return null;
  }
  function visit(node: LayoutNode): ReadonlyArray<PathStep> | null {
    if (node.scopeVariables !== undefined) {
      const found = expressionsOfNode(
        getExpressionAtPath(expression, node.path),
      ).some(
        // 全体を文字列にする前にタグで絞る (大きな式で何度も文字列にしないため)
        (value) =>
          variantOf(value)?.tag === targetTag && canonicalKey(value) === target,
      );
      if (found) {
        return node.path;
      }
    }
    for (const child of node.children) {
      const found = visit(child);
      if (found !== null) return found;
    }
    return null;
  }
  return visit(layoutRoot);
}

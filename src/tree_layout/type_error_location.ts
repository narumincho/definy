import type { LayoutNode, PathStep } from "./types.ts";
import { getExpressionAtPath } from "./mutation.ts";
import {
  definyAstToSelfHostedAst,
  type DefinyValue,
} from "../stage1_compiler.ts";

/**
 * 値を作るだけの式 (`definyAstToSelfHostedAst` の結果) を評価して, 型チェッカーが受け取る値にする.
 * バリアント・レコード・リスト・リテラル以外は `undefined`
 */
function constructorAstValue(ast: unknown): DefinyValue | undefined {
  if (typeof ast !== "object" || ast === null) return undefined;
  const obj = ast as Record<string, Record<string, unknown> | undefined>;
  if (obj.Variant) {
    const payload =
      "payload" in obj.Variant
        ? constructorAstValue(obj.Variant.payload)
        : null;
    return payload === undefined
      ? undefined
      : { tag: String(obj.Variant.tag), payload };
  }
  if (obj.TypeLiteral) {
    const result: Record<string, DefinyValue> = {};
    for (const item of obj.TypeLiteral.items as ReadonlyArray<{
      readonly key: string;
      readonly value: unknown;
    }>) {
      const value = constructorAstValue(item.value);
      if (value === undefined) return undefined;
      result[item.key] = value;
    }
    return result;
  }
  if (obj.ListLiteral) {
    const items: Array<DefinyValue> = [];
    for (const item of obj.ListLiteral.items as ReadonlyArray<unknown>) {
      const value = constructorAstValue(item);
      if (value === undefined) return undefined;
      items.push(value);
    }
    return items;
  }
  if (obj.Number) return Number(obj.Number.value);
  if (obj.String) return String(obj.String.value);
  if (obj.Boolean) return obj.Boolean.value === true;
  return undefined;
}

/** 比べるための文字列. レコードのキーの順番によらない */
function canonicalKey(value: DefinyValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalKey).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as { readonly [key: string]: DefinyValue };
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalKey(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** 式 (エディタの形) を型チェッカーが受け取る `core.expression` の値にする. 表せなければ `undefined` */
export function expressionToSelfHostedValue(
  expression: unknown,
): DefinyValue | undefined {
  try {
    return constructorAstValue(definyAstToSelfHostedAst(expression));
  } catch {
    return undefined;
  }
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
  const targetTag =
    typeof errorExpression === "object" &&
    errorExpression !== null &&
    "tag" in errorExpression
      ? errorExpression.tag
      : undefined;
  function visit(node: LayoutNode): ReadonlyArray<PathStep> | null {
    if (node.scopeVariables !== undefined) {
      const value = expressionToSelfHostedValue(
        getExpressionAtPath(expression, node.path),
      );
      // 全体を文字列にする前にタグで絞る (大きな式で何度も文字列にしないため)
      if (
        typeof value === "object" &&
        value !== null &&
        "tag" in value &&
        value.tag === targetTag &&
        canonicalKey(value) === target
      ) {
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

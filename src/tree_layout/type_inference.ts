import type { PathStep } from "./types.ts";
import { updateExpressionAtPath } from "./path.ts";
import { nextVariableId } from "./selection.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import { variant, variantOf } from "../definy_value.ts";
import { variantOptionValueForExpression } from "./variant.ts";
import {
  callOf,
  letChain,
  isWildcardArm,
  matchOf,
  partReferenceIdOf,
  variableIdOf,
} from "./expression.ts";

export type ExpectedType = "number" | "string" | "boolean" | "list" | "any";

/** 型チェッカーに期待する型を聞く位置に置く未入力. 型チェッカーはこの位置で期待する型を `hole_expected_type` のエラーで返す */
export const EXPECTED_TYPE_PROBE = variant("hole", { probe: true });

/** 式の `path` の位置を {@link EXPECTED_TYPE_PROBE} に置き換える */
export function probeExpressionAt(
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown {
  return updateExpressionAtPath(rootExpr, path, () => EXPECTED_TYPE_PROBE);
}

/**
 * 式の `path` の位置の式 `t` の型を型チェッカーに聞くための式.
 * `t` を `let _ = [t, probe] in t` にする. let は束縛の値を推論するので, リストは最初の要素 `t` の型を推論し,
 * 2 つ目の probe ではその型を期待する型として返す (probe のエラーで検査は止まるので, 本体は検査されない).
 * `[t, probe]` を直接置くと, 期待型のある位置 (関数の本体など) ではリストが期待型と合わずに先に型エラーになる.
 * 推論できない式 (引数の型を書かない関数・未入力など) では分からない
 */
export function probeInferredTypeAt(
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown {
  const variableId = nextVariableId(rootExpr);
  return updateExpressionAtPath(rootExpr, path, (node) =>
    letChain(
      [
        {
          variable_id: variableId,
          variable_name: "_",
          value: variant("list", [node, EXPECTED_TYPE_PROBE]),
        },
      ],
      node,
    ),
  );
}

/** 式の型. `inferred` は式から推論した型, `expected` は推論できず, その位置で期待する型 */
export type ExpressionTypeAt = {
  readonly kind: "inferred" | "expected";
  readonly type: DefinyValue;
};

/**
 * 式の `path` の位置の式の型を型チェッカー (`findExpectedType`) に聞く.
 * まず式から推論した型 ({@link probeInferredTypeAt}) を聞き, 分からなければその位置で期待する型を聞く.
 * どちらも分からなければ `null`
 */
export async function findExpressionTypeAt(
  findExpectedType: (part: {
    readonly partType: unknown;
    readonly expression: unknown;
  }) => DefinyValue | null | Promise<DefinyValue | null>,
  partType: unknown,
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
): Promise<ExpressionTypeAt | null> {
  const inferred = await findExpectedType({
    partType,
    expression: probeInferredTypeAt(rootExpr, path),
  });
  if (inferred !== null) {
    return { kind: "inferred", type: inferred };
  }
  const expected = await findExpectedType({
    partType,
    expression: probeExpressionAt(rootExpr, path),
  });
  return expected === null ? null : { kind: "expected", type: expected };
}

/**
 * 型チェッカーが返した期待する型 (`core.type-ast` の値) を, 選択肢の並び替えに使う大まかな型にする.
 * 関数・レコード・直和型・型パーツの参照などは区別しない ("any")
 */
export function expectedTypeFromTypeAst(
  type: DefinyValue | null,
): ExpectedType {
  const tag = variantOf(type)?.tag;
  switch (tag) {
    case "number":
    case "string":
    case "boolean":
    case "list":
      return tag;
  }
  return "any";
}

/**
 * 式ノードから対応する SelectorOption の value を特定する
 */
export function getOptionValueForExpression(node: unknown): string | null {
  const tagged = variantOf(node);
  if (tagged === undefined) {
    return null;
  }
  const { tag, payload } = tagged;
  switch (tag) {
    // 型の式 (part_type.ts)
    case "type_number":
    case "type_string":
    case "type_boolean":
    case "type_type":
    case "type_secret":
    case "type_list":
    case "type_code":
    case "type_function":
    case "type_record":
    case "type_union":
      return `expr:type:${tag.slice("type_".length)}`;
    case "number":
      return "expr:number";
    case "string":
      return "expr:string";
    case "boolean":
      return payload === false ? "expr:boolean:false" : "expr:boolean:true";
    case "list":
      return "expr:list";
    case "quote":
      return "expr:quote";
    case "secret":
      return "expr:secret";
    case "let":
      return "expr:let";
    case "match":
      return isBooleanMatch(node) ? "expr:match_boolean" : "expr:match";
    case "hole":
      return "expr:hole";
    case "variant":
      return variantOptionValueForExpression(node);
    case "variable": {
      const id = variableIdOf(node);
      return id === null ? null : `ref:local:${id}`;
    }
    // 呼び出しは, 呼び出しているパーツ・関数型の変数の選択肢 (選び直すと同じ名前の引数の式を引き継ぐ)
    case "call": {
      const value = getOptionValueForExpression(callOf(node)?.callee);
      return value?.startsWith("ref:part:") || value?.startsWith("ref:local:")
        ? value
        : null;
    }
    case "part_reference": {
      const id = partReferenceIdOf(node);
      return id === null ? null : `ref:part:${id}`;
    }
  }
  return null;
}

/** アームが `true` / `false` (と `_`) だけの, Bool に対する match か. `_` だけの match は違う */
export function isBooleanMatch(expression: unknown): boolean {
  const arms = matchOf(expression)?.arms ?? [];
  return (
    arms.some((arm) => arm.kind === "boolean") &&
    arms.every((arm) => arm.kind === "boolean" || isWildcardArm(arm))
  );
}

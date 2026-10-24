import type { PathStep } from "./types.ts";
import { updateExpressionAtPath } from "./path.ts";
import { nextVariableId } from "./selection.ts";
import { bytesToUrlSafeBase64NoPad, toUint8Array } from "../cbor.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import { variantOptionValueForExpression } from "./variant.ts";

export type ExpectedType = "number" | "string" | "boolean" | "list" | "any";

/** 型チェッカーに期待する型を聞く位置に置く未入力 (`definyAstWithHolesToSelfHostedAst` が `hole({ probe: true })` にする) */
export const EXPECTED_TYPE_PROBE = { Hole: { probe: true } } as const;

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
  return updateExpressionAtPath(rootExpr, path, (node) => ({
    Let: {
      bindings: [
        {
          variable_id: variableId,
          variable_name: "_",
          value: { ListLiteral: { items: [node, EXPECTED_TYPE_PROBE] } },
        },
      ],
      body: node,
    },
  }));
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
  const tag = (type as { readonly tag?: unknown } | null)?.tag;
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
  // 型の式 (part_type.ts)
  if (typeof node === "string" && /^Type[A-Z]/.test(node)) {
    return `expr:type:${node.slice(4).toLowerCase()}`;
  }
  if (!node || typeof node !== "object") {
    return null;
  }
  const obj = node as Record<string, unknown>;
  if ("TypeList" in obj) return "expr:type:list";
  if ("TypeCode" in obj) return "expr:type:code";
  if ("TypeFunction" in obj) return "expr:type:function";
  if ("TypeUnion" in obj) return "expr:type:union";

  if ("Number" in obj) return "expr:number";
  if ("String" in obj) return "expr:string";
  if ("Boolean" in obj) {
    const b = obj.Boolean as { value?: unknown };
    return b.value === false ? "expr:boolean:false" : "expr:boolean:true";
  }
  if ("ListLiteral" in obj) return "expr:list";
  if ("Quote" in obj) return "expr:quote";
  if ("Let" in obj) return "expr:let";
  if ("Match" in obj) {
    return isBooleanMatch(obj.Match) ? "expr:match_boolean" : "expr:match";
  }
  if ("If" in obj) return "expr:if";
  if ("Hole" in obj) return "expr:hole";
  if ("Variant" in obj) return variantOptionValueForExpression(obj);
  if ("Variable" in obj) {
    const raw = obj.Variable;
    const id =
      typeof raw === "number"
        ? raw
        : (raw as { variable_id?: unknown } | null)?.variable_id;
    if (typeof id === "number" || typeof id === "bigint") {
      return `ref:local:${id}`;
    }
  }

  // 呼び出しは, 呼び出しているパーツ・関数型の変数の選択肢 (選び直すと同じ名前の引数の式を引き継ぐ)
  if ("Call" in obj) {
    const fn = (obj.Call as { readonly function?: unknown } | null)?.function;
    const value = getOptionValueForExpression(fn);
    return value?.startsWith("ref:part:") || value?.startsWith("ref:local:")
      ? value
      : null;
  }

  if ("PartReference" in obj) {
    const raw = (obj.PartReference as { part_definition_event_hash?: unknown })
      ?.part_definition_event_hash;
    const bytes = toUint8Array(raw);
    const b64 = bytes ? bytesToUrlSafeBase64NoPad(bytes) : null;
    if (b64) {
      return `ref:part:${b64}`;
    }
  }

  return null;
}

const BOOLEAN_MATCH_TAGS: ReadonlySet<string> = new Set(["true", "false", "_"]);

/** アームが `true` / `false` (と `_`) だけの, Bool に対する match か */
export function isBooleanMatch(match: unknown): boolean {
  const arms = (match as { arms?: unknown } | null)?.arms;
  return (
    Array.isArray(arms) &&
    arms.length > 0 &&
    arms.every((arm: { tag?: unknown }) =>
      BOOLEAN_MATCH_TAGS.has(String(arm?.tag)),
    )
  );
}

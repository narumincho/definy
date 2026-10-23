import type { PathStep } from "./types.ts";
import { updateExpressionAtPath } from "./path.ts";
import { bytesToUrlSafeBase64NoPad, toUint8Array } from "../cbor.ts";
import type { DefinyValue } from "../stage1_compiler.ts";

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
  if ("TypeFunction" in obj) return "expr:type:function";
  if ("TypeUnion" in obj) return "expr:type:union";

  if ("Number" in obj) return "expr:number";
  if ("String" in obj) return "expr:string";
  if ("Boolean" in obj) {
    const b = obj.Boolean as { value?: unknown };
    return b.value === false ? "expr:boolean:false" : "expr:boolean:true";
  }
  if ("ListLiteral" in obj) return "expr:list";
  if ("Let" in obj) return "expr:let";
  if ("Match" in obj) {
    return isBooleanMatch(obj.Match) ? "expr:match_boolean" : "expr:match";
  }
  if ("If" in obj) return "expr:if";
  if ("Hole" in obj) return "expr:hole";
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

  // パーツの呼び出しは, 呼び出しているパーツの選択肢 (選び直すと同じ名前の引数の式を引き継ぐ)
  if ("Call" in obj) {
    const fn = (obj.Call as { readonly function?: unknown } | null)?.function;
    const value = getOptionValueForExpression(fn);
    return value?.startsWith("ref:part:") ? value : null;
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

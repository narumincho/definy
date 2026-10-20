import type { PathStep } from "./types.ts";
import { getExpressionAtPath } from "./mutation.ts";
import { bytesToUrlSafeBase64NoPad, toUint8Array } from "../cbor.ts";

export type ExpectedType = "number" | "string" | "boolean" | "list" | "any";

/**
 * 式ノード単体からその評価結果の型を推論する
 */
export function inferExpressionType(node: unknown): ExpectedType {
  if (!node || typeof node !== "object") {
    return "any";
  }
  const obj = node as Record<string, unknown>;

  if ("Number" in obj) return "number";
  if ("String" in obj) return "string";
  if ("Boolean" in obj) return "boolean";
  if ("ListLiteral" in obj) return "list";

  if (
    "Add" in obj ||
    "Subtract" in obj ||
    "Multiply" in obj ||
    "Divide" in obj ||
    "Remainder" in obj
  ) {
    return "number";
  }

  if (
    "Equal" in obj ||
    "NotEqual" in obj ||
    "LessThan" in obj ||
    "LessThanOrEqual" in obj ||
    "GreaterThan" in obj ||
    "GreaterThanOrEqual" in obj ||
    "And" in obj ||
    "Or" in obj ||
    "Not" in obj
  ) {
    return "boolean";
  }

  if (
    "BitAnd" in obj ||
    "BitOr" in obj ||
    "BitXor" in obj ||
    "ShiftLeft" in obj ||
    "ShiftRight" in obj
  ) {
    return "number";
  }

  if ("ListLength" in obj || "StringLength" in obj) return "number";
  if ("StringConcat" in obj || "StringSlice" in obj) return "string";
  if ("ListConcat" in obj || "ListAppend" in obj || "StringToBytes" in obj) {
    return "list";
  }

  return "any";
}

/**
 * 定義の partType から期待される型を抽出する
 */
function typeFromPartType(partType: unknown): ExpectedType {
  if (!partType) return "any";
  if (typeof partType === "string") {
    if (partType === "number") return "number";
    if (partType === "string") return "string";
    if (partType === "boolean") return "boolean";
    if (partType === "list") return "list";
  }
  if (typeof partType === "object") {
    const obj = partType as Record<string, unknown>;
    if ("function" in obj) {
      const fn = obj.function as { return_type?: unknown };
      return typeFromPartType(fn.return_type);
    }
  }
  return "any";
}

/**
 * 式の木構造と選択中パスから、その位置で期待される型 (ExpectedType) を推論する
 */
export function inferExpectedType(
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
  partType?: unknown,
): ExpectedType {
  if (path.length === 0) {
    return typeFromPartType(partType);
  }

  const parentPath = path.slice(0, -1);
  const lastStep = path[path.length - 1];
  const parentNode = getExpressionAtPath(rootExpr, parentPath);

  if (!parentNode || typeof parentNode !== "object") {
    return "any";
  }
  const parent = parentNode as Record<string, unknown>;

  // list-get, string-slice などの子の式
  const fieldTypes: ReadonlyArray<readonly [string, PathStep, ExpectedType]> = [
    ["ListGet", "left", "list"],
    ["ListGet", "index", "number"],
    ["ListAppend", "left", "list"],
    ["ListLength", "condition", "list"],
    ["StringLength", "condition", "string"],
    ["StringToBytes", "condition", "string"],
    ["StringSlice", "condition", "string"],
    ["StringSlice", "start", "number"],
    ["StringSlice", "end", "number"],
  ];
  for (const [key, step, type] of fieldTypes) {
    if (key in parent && lastStep === step) {
      return type;
    }
  }

  if (lastStep === "left" || lastStep === "right") {
    if (
      "Add" in parent ||
      "Subtract" in parent ||
      "Multiply" in parent ||
      "Divide" in parent ||
      "Remainder" in parent ||
      "LessThan" in parent ||
      "LessThanOrEqual" in parent ||
      "GreaterThan" in parent ||
      "GreaterThanOrEqual" in parent ||
      "BitAnd" in parent ||
      "BitOr" in parent ||
      "BitXor" in parent ||
      "ShiftLeft" in parent ||
      "ShiftRight" in parent
    ) {
      return "number";
    }

    if ("And" in parent || "Or" in parent) {
      return "boolean";
    }

    if ("StringConcat" in parent) {
      return "string";
    }

    if ("ListConcat" in parent) {
      return "list";
    }

    if ("Equal" in parent || "NotEqual" in parent) {
      const op = (parent.Equal ?? parent.NotEqual) as {
        left?: unknown;
        right?: unknown;
      };
      const sibling = lastStep === "left" ? op?.right : op?.left;
      const siblingType = inferExpressionType(sibling);
      if (siblingType !== "any") {
        return siblingType;
      }
    }
  }

  if (lastStep === "condition") {
    return "boolean";
  }

  if (lastStep === "then" || lastStep === "else") {
    if ("If" in parent) {
      const ifNode = parent.If as {
        then_expr?: unknown;
        then?: unknown;
        else_expr?: unknown;
        else?: unknown;
      };
      const sibling =
        lastStep === "then"
          ? (ifNode.else_expr ?? ifNode.else)
          : (ifNode.then_expr ?? ifNode.then);
      const siblingType = inferExpressionType(sibling);
      if (siblingType !== "any") {
        return siblingType;
      }
      return inferExpectedType(rootExpr, parentPath, partType);
    }
  }

  if (lastStep === "letBody") {
    return inferExpectedType(rootExpr, parentPath, partType);
  }

  if (lastStep === "functionBody") {
    return typeFromPartType(partType);
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
  if ("Add" in obj) return "expr:add";
  if ("Subtract" in obj) return "expr:subtract";
  if ("Multiply" in obj) return "expr:multiply";
  if ("Divide" in obj) return "expr:divide";
  if ("Remainder" in obj) return "expr:remainder";
  if ("Equal" in obj) return "expr:equal";
  if ("NotEqual" in obj) return "expr:not_equal";
  if ("LessThan" in obj) return "expr:less_than";
  if ("LessThanOrEqual" in obj) return "expr:less_than_or_equal";
  if ("GreaterThan" in obj) return "expr:greater_than";
  if ("GreaterThanOrEqual" in obj) return "expr:greater_than_or_equal";
  if ("BitAnd" in obj) return "expr:bit_and";
  if ("BitOr" in obj) return "expr:bit_or";
  if ("BitXor" in obj) return "expr:bit_xor";
  if ("ShiftLeft" in obj) return "expr:shift_left";
  if ("ShiftRight" in obj) return "expr:shift_right";
  if ("And" in obj) return "expr:and";
  if ("Or" in obj) return "expr:or";
  if ("Not" in obj) return "expr:not";
  if ("StringConcat" in obj) return "expr:string_concat";
  if ("ListConcat" in obj) return "expr:list_concat";
  if ("ListGet" in obj) return "expr:list_get";
  if ("ListLength" in obj) return "expr:list_length";
  if ("ListAppend" in obj) return "expr:list_append";
  if ("StringLength" in obj) return "expr:string_length";
  if ("StringSlice" in obj) return "expr:string_slice";
  if ("Let" in obj) return "expr:let";
  if ("Match" in obj && isBooleanMatch(obj.Match)) return "expr:match_boolean";
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

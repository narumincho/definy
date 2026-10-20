import type { PathStep } from "./types.ts";
import { base64ToBytes } from "../cbor.ts";

/**
 * 子の式をフィールド 1 つに持つ組み込みの式の, パスの段とフィールド名の対応.
 * ast_to_layout.ts の表示とここでの取得・更新で同じ対応を使う
 */
export const FIELD_STEPS: Readonly<
  Record<
    string,
    ReadonlyArray<{ readonly step: string; readonly field: string }>
  >
> = {
  ListGet: [
    { step: "left", field: "list" },
    { step: "index", field: "index" },
  ],
  ListAppend: [
    { step: "left", field: "list" },
    { step: "item", field: "item" },
  ],
  ListLength: [{ step: "condition", field: "value" }],
  StringLength: [{ step: "condition", field: "value" }],
  StringToBytes: [{ step: "condition", field: "value" }],
  StringSlice: [
    { step: "condition", field: "value" },
    { step: "start", field: "start" },
    { step: "end", field: "end" },
  ],
  TypeList: [{ step: "typeListItem", field: "item_type" }],
};

/** パスの段がフィールドの表にあれば, その式のキーとフィールド名 */
function fieldForStep(
  node: Record<string, unknown>,
  head: PathStep,
): { readonly key: string; readonly field: string } | null {
  if (typeof head !== "string") return null;
  for (const [key, steps] of Object.entries(FIELD_STEPS)) {
    if (key in node) {
      const found = steps.find((s) => s.step === head);
      return found ? { key, field: found.field } : null;
    }
  }
  return null;
}

/** union 型の i 番目のバリアントのペイロードの型 */
function typeUnionVariants(
  node: Record<string, unknown>,
): ReadonlyArray<{ readonly payload_type?: unknown }> | null {
  if (!("TypeUnion" in node)) return null;
  const variants = (node.TypeUnion as { variants?: unknown } | null)?.variants;
  return Array.isArray(variants) ? variants : null;
}

export function getExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown | undefined {
  if (path.length === 0) {
    return expr;
  }
  if (!expr || typeof expr !== "object") {
    return undefined;
  }

  const node = expr as Record<string, unknown>;
  const [head, ...tail] = path;
  if (!head) return expr;

  const fieldStep = fieldForStep(node, head);
  if (fieldStep) {
    const inner = node[fieldStep.key] as Record<string, unknown> | null;
    return getExpressionAtPath(inner?.[fieldStep.field], tail);
  }
  const variants = typeUnionVariants(node);
  if (
    variants &&
    typeof head === "object" &&
    head.kind === "typeUnionVariant"
  ) {
    return getExpressionAtPath(variants[head.index]?.payload_type, tail);
  }
  if ("TypeFunction" in node) {
    const fn = node.TypeFunction as {
      parameters?: ReadonlyArray<{ type?: unknown }>;
      return_type?: unknown;
    } | null;
    if (typeof head === "object" && head.kind === "typeFunctionParameter") {
      return getExpressionAtPath(fn?.parameters?.[head.index]?.type, tail);
    }
    if (head === "typeFunctionReturn") {
      return getExpressionAtPath(fn?.return_type, tail);
    }
  }

  if (head === "left") {
    for (const key of Object.keys(node)) {
      const inner = node[key] as { left?: unknown };
      if (inner && "left" in inner) {
        return getExpressionAtPath(inner.left, tail);
      }
    }
  }

  if (head === "right") {
    for (const key of Object.keys(node)) {
      const inner = node[key] as { right?: unknown };
      if (inner && "right" in inner) {
        return getExpressionAtPath(inner.right, tail);
      }
    }
  }

  if (head === "condition") {
    if ("Not" in node) {
      return getExpressionAtPath(
        (node.Not as { value?: unknown })?.value,
        tail,
      );
    }
    if ("If" in node) {
      return getExpressionAtPath(
        (node.If as { condition?: unknown })?.condition,
        tail,
      );
    }
  }

  if (head === "then" && "If" in node) {
    const ifNode = node.If as { then_expr?: unknown; then?: unknown };
    return getExpressionAtPath(ifNode.then_expr ?? ifNode.then, tail);
  }

  if (head === "else" && "If" in node) {
    const ifNode = node.If as { else_expr?: unknown; else?: unknown };
    return getExpressionAtPath(ifNode.else_expr ?? ifNode.else, tail);
  }

  if (head === "letBody" && "Let" in node) {
    return getExpressionAtPath((node.Let as { body?: unknown })?.body, tail);
  }

  if (head === "letValue" && "Let" in node) {
    return getExpressionAtPath((node.Let as { value?: unknown })?.value, tail);
  }

  if (
    typeof head === "object" &&
    head.kind === "letBindingValue" &&
    "Let" in node
  ) {
    const bindings = (
      node.Let as { bindings?: ReadonlyArray<{ value?: unknown }> }
    )?.bindings;
    if (bindings && head.index < bindings.length) {
      return getExpressionAtPath(bindings[head.index]?.value, tail);
    }
  }

  if (head === "functionBody" && "Function" in node) {
    return getExpressionAtPath(
      (node.Function as { body?: unknown })?.body,
      tail,
    );
  }

  if (head === "callFunction" && "Call" in node) {
    return getExpressionAtPath(
      (node.Call as { function?: unknown })?.function,
      tail,
    );
  }

  if (
    typeof head === "object" &&
    head.kind === "callArgument" &&
    "Call" in node
  ) {
    const args = (
      node.Call as { arguments?: ReadonlyArray<{ value?: unknown }> }
    )?.arguments;
    if (args && head.index < args.length) {
      return getExpressionAtPath(args[head.index]?.value, tail);
    }
  }

  if (
    typeof head === "object" &&
    head.kind === "listItemValue" &&
    "ListLiteral" in node
  ) {
    const items = (node.ListLiteral as { items?: ReadonlyArray<unknown> })
      ?.items;
    if (items && head.index < items.length) {
      return getExpressionAtPath(items[head.index], tail);
    }
  }

  if (
    typeof head === "object" &&
    head.kind === "recordItemValue" &&
    ("TypeLiteral" in node || "RecordLiteral" in node)
  ) {
    const inner = (node.TypeLiteral ?? node.RecordLiteral) as {
      items?: ReadonlyArray<{ value?: unknown }>;
    };
    if (inner?.items && head.index < inner.items.length) {
      return getExpressionAtPath(inner.items[head.index]?.value, tail);
    }
  }

  if (head === "record" && "RecordGet" in node) {
    return getExpressionAtPath(
      (node.RecordGet as { record?: unknown })?.record,
      tail,
    );
  }

  if (head === "variantPayload" && "Variant" in node) {
    return getExpressionAtPath(
      (node.Variant as { payload?: unknown })?.payload,
      tail,
    );
  }

  if (head === "constructorValue" && "Constructor" in node) {
    return getExpressionAtPath(
      (node.Constructor as { value?: unknown })?.value,
      tail,
    );
  }

  if (head === "matchTarget" && "Match" in node) {
    return getExpressionAtPath(
      (node.Match as { target?: unknown })?.target,
      tail,
    );
  }

  if (
    typeof head === "object" &&
    head.kind === "matchArmBody" &&
    "Match" in node
  ) {
    const arms = (node.Match as { arms?: ReadonlyArray<{ body?: unknown }> })
      ?.arms;
    if (arms && head.index < arms.length) {
      return getExpressionAtPath(arms[head.index]?.body, tail);
    }
  }

  if (head === "matchDefault" && "Match" in node) {
    return getExpressionAtPath(
      (node.Match as { default?: unknown })?.default,
      tail,
    );
  }

  return undefined;
}

export function updateExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  updater: (target: unknown) => unknown,
): unknown {
  if (path.length === 0) {
    return updater(expr);
  }
  if (!expr || typeof expr !== "object") {
    return expr;
  }

  const node = expr as Record<string, unknown>;
  const [head, ...tail] = path;
  if (!head) return updater(expr);

  const fieldStep = fieldForStep(node, head);
  if (fieldStep) {
    const inner = (node[fieldStep.key] ?? {}) as Record<string, unknown>;
    return {
      ...node,
      [fieldStep.key]: {
        ...inner,
        [fieldStep.field]: updateExpressionAtPath(
          inner[fieldStep.field],
          tail,
          updater,
        ),
      },
    };
  }
  if ("TypeFunction" in node) {
    const fn = (node.TypeFunction ?? {}) as {
      parameters?: ReadonlyArray<{ type?: unknown }>;
      return_type?: unknown;
    };
    if (typeof head === "object" && head.kind === "typeFunctionParameter") {
      return {
        ...node,
        TypeFunction: {
          ...fn,
          parameters: (fn.parameters ?? []).map((p, i) =>
            i === head.index
              ? { ...p, type: updateExpressionAtPath(p.type, tail, updater) }
              : p,
          ),
        },
      };
    }
    if (head === "typeFunctionReturn") {
      return {
        ...node,
        TypeFunction: {
          ...fn,
          return_type: updateExpressionAtPath(fn.return_type, tail, updater),
        },
      };
    }
  }
  const variants = typeUnionVariants(node);
  if (
    variants &&
    typeof head === "object" &&
    head.kind === "typeUnionVariant"
  ) {
    return {
      ...node,
      TypeUnion: {
        ...(node.TypeUnion as object),
        variants: variants.map((v, i) =>
          i === head.index
            ? {
                ...v,
                payload_type: updateExpressionAtPath(
                  v.payload_type,
                  tail,
                  updater,
                ),
              }
            : v,
        ),
      },
    };
  }

  if (head === "left") {
    for (const key of Object.keys(node)) {
      const inner = node[key] as { left?: unknown; right?: unknown };
      if (inner && "left" in inner) {
        return {
          ...node,
          [key]: {
            ...inner,
            left: updateExpressionAtPath(inner.left, tail, updater),
          },
        };
      }
    }
  }

  if (head === "right") {
    for (const key of Object.keys(node)) {
      const inner = node[key] as { left?: unknown; right?: unknown };
      if (inner && "right" in inner) {
        return {
          ...node,
          [key]: {
            ...inner,
            right: updateExpressionAtPath(inner.right, tail, updater),
          },
        };
      }
    }
  }

  if (head === "condition") {
    if ("Not" in node) {
      const notInner = node.Not as { value?: unknown };
      return {
        ...node,
        Not: {
          ...notInner,
          value: updateExpressionAtPath(notInner.value, tail, updater),
        },
      };
    }
    if ("If" in node) {
      const ifInner = node.If as { condition?: unknown };
      return {
        ...node,
        If: {
          ...ifInner,
          condition: updateExpressionAtPath(ifInner.condition, tail, updater),
        },
      };
    }
  }

  if (head === "then" && "If" in node) {
    const ifInner = node.If as Record<string, unknown>;
    const thenKey = "then_expr" in ifInner ? "then_expr" : "then";
    return {
      ...node,
      If: {
        ...ifInner,
        [thenKey]: updateExpressionAtPath(ifInner[thenKey], tail, updater),
      },
    };
  }

  if (head === "else" && "If" in node) {
    const ifInner = node.If as Record<string, unknown>;
    const elseKey = "else_expr" in ifInner ? "else_expr" : "else";
    return {
      ...node,
      If: {
        ...ifInner,
        [elseKey]: updateExpressionAtPath(ifInner[elseKey], tail, updater),
      },
    };
  }

  if (head === "letBody" && "Let" in node) {
    const letInner = node.Let as { body?: unknown };
    return {
      ...node,
      Let: {
        ...letInner,
        body: updateExpressionAtPath(letInner.body, tail, updater),
      },
    };
  }

  if (head === "letValue" && "Let" in node) {
    const letInner = node.Let as { value?: unknown };
    return {
      ...node,
      Let: {
        ...letInner,
        value: updateExpressionAtPath(letInner.value, tail, updater),
      },
    };
  }

  if (
    typeof head === "object" &&
    head.kind === "letBindingValue" &&
    "Let" in node
  ) {
    const letInner = node.Let as {
      readonly bindings?: ReadonlyArray<{
        readonly variable_id?: unknown;
        readonly variable_name?: unknown;
        readonly value?: unknown;
      }>;
    };
    if (Array.isArray(letInner.bindings)) {
      const updated = letInner.bindings.map((b, idx) =>
        idx === head.index
          ? {
              ...b,
              value: updateExpressionAtPath(b.value, tail, updater),
            }
          : b,
      );
      return {
        ...node,
        Let: {
          ...letInner,
          bindings: updated,
        },
      };
    }
  }

  if (head === "functionBody" && "Function" in node) {
    const fnInner = node.Function as { body?: unknown };
    return {
      ...node,
      Function: {
        ...fnInner,
        body: updateExpressionAtPath(fnInner.body, tail, updater),
      },
    };
  }

  if (head === "callFunction" && "Call" in node) {
    const callInner = node.Call as { function?: unknown };
    return {
      ...node,
      Call: {
        ...callInner,
        function: updateExpressionAtPath(callInner.function, tail, updater),
      },
    };
  }

  if (
    typeof head === "object" &&
    head.kind === "callArgument" &&
    "Call" in node
  ) {
    const callInner = node.Call as {
      arguments?: ReadonlyArray<{ name?: unknown; value?: unknown }>;
    };
    if (Array.isArray(callInner.arguments)) {
      const updated = callInner.arguments.map((arg, idx) =>
        idx === head.index
          ? {
              ...arg,
              value: updateExpressionAtPath(arg.value, tail, updater),
            }
          : arg,
      );
      return {
        ...node,
        Call: {
          ...callInner,
          arguments: updated,
        },
      };
    }
  }

  if (
    typeof head === "object" &&
    head.kind === "listItemValue" &&
    "ListLiteral" in node
  ) {
    const listInner = node.ListLiteral as { items?: ReadonlyArray<unknown> };
    if (Array.isArray(listInner.items)) {
      const updated = listInner.items.map((item, idx) =>
        idx === head.index ? updateExpressionAtPath(item, tail, updater) : item,
      );
      return {
        ...node,
        ListLiteral: {
          ...listInner,
          items: updated,
        },
      };
    }
  }

  if (
    typeof head === "object" &&
    head.kind === "recordItemValue" &&
    ("TypeLiteral" in node || "RecordLiteral" in node)
  ) {
    const wrapperKey = "TypeLiteral" in node ? "TypeLiteral" : "RecordLiteral";
    const recInner = node[wrapperKey] as {
      items?: ReadonlyArray<{ key?: unknown; name?: unknown; value?: unknown }>;
    };
    if (Array.isArray(recInner.items)) {
      const updated = recInner.items.map((field, idx) =>
        idx === head.index
          ? {
              ...field,
              value: updateExpressionAtPath(field.value, tail, updater),
            }
          : field,
      );
      return {
        ...node,
        [wrapperKey]: {
          ...recInner,
          items: updated,
        },
      };
    }
  }

  if (head === "record" && "RecordGet" in node) {
    const rgInner = node.RecordGet as { record?: unknown };
    return {
      ...node,
      RecordGet: {
        ...rgInner,
        record: updateExpressionAtPath(rgInner.record, tail, updater),
      },
    };
  }

  if (head === "variantPayload" && "Variant" in node) {
    const vInner = node.Variant as { payload?: unknown };
    return {
      ...node,
      Variant: {
        ...vInner,
        payload: updateExpressionAtPath(vInner.payload, tail, updater),
      },
    };
  }

  if (head === "constructorValue" && "Constructor" in node) {
    const cInner = node.Constructor as { value?: unknown };
    return {
      ...node,
      Constructor: {
        ...cInner,
        value: updateExpressionAtPath(cInner.value, tail, updater),
      },
    };
  }

  if (head === "matchTarget" && "Match" in node) {
    const mInner = node.Match as { target?: unknown };
    return {
      ...node,
      Match: {
        ...mInner,
        target: updateExpressionAtPath(mInner.target, tail, updater),
      },
    };
  }

  if (
    typeof head === "object" &&
    head.kind === "matchArmBody" &&
    "Match" in node
  ) {
    const mInner = node.Match as {
      readonly arms?: ReadonlyArray<{
        readonly pattern?: unknown;
        readonly body?: unknown;
      }>;
    };
    if (Array.isArray(mInner.arms)) {
      const updated = mInner.arms.map((arm, idx) =>
        idx === head.index
          ? {
              ...arm,
              body: updateExpressionAtPath(arm.body, tail, updater),
            }
          : arm,
      );
      return {
        ...node,
        Match: {
          ...mInner,
          arms: updated,
        },
      };
    }
  }

  if (head === "matchDefault" && "Match" in node) {
    const mInner = node.Match as { default?: unknown };
    return {
      ...node,
      Match: {
        ...mInner,
        default: updateExpressionAtPath(mInner.default, tail, updater),
      },
    };
  }

  return expr;
}

export function setNumberValue(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: number,
): unknown {
  return updateExpressionAtPath(expr, path, () => ({
    Number: { value },
  }));
}

export function setStringValue(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): unknown {
  return updateExpressionAtPath(expr, path, () => ({
    String: { value },
  }));
}

export function clearExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown {
  return updateExpressionAtPath(expr, path, () => ({
    Hole: {},
  }));
}

export function applySelection(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  selectionValue: string,
): unknown {
  let newSubExpr: unknown;

  if (selectionValue === "expr:number") {
    newSubExpr = { Number: { value: 0 } };
  } else if (selectionValue === "expr:string") {
    newSubExpr = { String: { value: "" } };
  } else if (selectionValue === "expr:boolean:true") {
    newSubExpr = { Boolean: { value: true } };
  } else if (selectionValue === "expr:boolean:false") {
    newSubExpr = { Boolean: { value: false } };
  } else if (selectionValue === "expr:hole") {
    newSubExpr = { Hole: {} };
  } else if (selectionValue === "expr:add") {
    newSubExpr = {
      Add: { left: { Number: { value: 0 } }, right: { Number: { value: 0 } } },
    };
  } else if (selectionValue === "expr:subtract") {
    newSubExpr = {
      Subtract: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:multiply") {
    newSubExpr = {
      Multiply: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:divide") {
    newSubExpr = {
      Divide: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 1 } },
      },
    };
  } else if (selectionValue === "expr:remainder") {
    newSubExpr = {
      Remainder: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 1 } },
      },
    };
  } else if (selectionValue === "expr:equal") {
    newSubExpr = {
      Equal: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:not_equal") {
    newSubExpr = {
      NotEqual: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:less_than") {
    newSubExpr = {
      LessThan: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:greater_than") {
    newSubExpr = {
      GreaterThan: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:and") {
    newSubExpr = {
      And: {
        left: { Boolean: { value: true } },
        right: { Boolean: { value: true } },
      },
    };
  } else if (selectionValue === "expr:or") {
    newSubExpr = {
      Or: {
        left: { Boolean: { value: false } },
        right: { Boolean: { value: false } },
      },
    };
  } else if (selectionValue === "expr:not") {
    newSubExpr = {
      Not: { value: { Boolean: { value: false } } },
    };
  } else if (selectionValue === "expr:string_concat") {
    newSubExpr = {
      StringConcat: {
        left: { String: { value: "" } },
        right: { String: { value: "" } },
      },
    };
  } else if (selectionValue === "expr:list") {
    newSubExpr = { ListLiteral: { items: [] } };
  } else if (
    selectionValue === "expr:less_than_or_equal" ||
    selectionValue === "expr:greater_than_or_equal"
  ) {
    newSubExpr = {
      [selectionValue === "expr:less_than_or_equal"
        ? "LessThanOrEqual"
        : "GreaterThanOrEqual"]: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:list_concat") {
    newSubExpr = {
      ListConcat: {
        left: { ListLiteral: { items: [] } },
        right: { ListLiteral: { items: [] } },
      },
    };
  } else if (selectionValue === "expr:list_get") {
    newSubExpr = {
      ListGet: {
        list: { ListLiteral: { items: [] } },
        index: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:list_length") {
    newSubExpr = { ListLength: { value: { ListLiteral: { items: [] } } } };
  } else if (selectionValue === "expr:list_append") {
    newSubExpr = {
      ListAppend: {
        list: { ListLiteral: { items: [] } },
        item: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:string_length") {
    newSubExpr = { StringLength: { value: { String: { value: "" } } } };
  } else if (selectionValue === "expr:string_slice") {
    newSubExpr = {
      StringSlice: {
        value: { String: { value: "" } },
        start: { Number: { value: 0 } },
        end: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:let") {
    // 新しい変数は式全体で使われていない ID にし, 本体はその変数を参照しておく
    const variableId = nextVariableId(expr);
    newSubExpr = {
      Let: {
        bindings: [
          {
            variable_id: variableId,
            variable_name: "x",
            value: { Number: { value: 0 } },
          },
        ],
        body: { Variable: { variable_id: variableId } },
      },
    };
  } else if (selectionValue === "expr:match_boolean") {
    const arm = (tag: string) => ({
      tag,
      variable_id: null,
      variable_name: null,
      body: { Number: { value: 0 } },
    });
    newSubExpr = {
      Match: {
        target: { Boolean: { value: false } },
        arms: [arm("true"), arm("false")],
        default: null,
      },
    };
  } else if (selectionValue in TYPE_SELECTIONS) {
    newSubExpr = TYPE_SELECTIONS[selectionValue];
  } else if (selectionValue === "expr:if") {
    newSubExpr = {
      If: {
        condition: { Boolean: { value: true } },
        then_expr: { Number: { value: 1 } },
        else_expr: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue.startsWith("ref:local:")) {
    const varId = Number(selectionValue.replace("ref:local:", ""));
    newSubExpr = { Variable: { variable_id: varId } };
  } else if (selectionValue.startsWith("ref:part:")) {
    const partHash = selectionValue.replace("ref:part:", "");
    newSubExpr = {
      PartReference: {
        part_definition_event_hash: base64ToBytes(partHash),
      },
    };
  } else {
    return expr;
  }

  // 二項演算を別の二項演算に差し替えるときは, 既定値で上書きせず元の左右の式を引き継ぐ
  // (例: `index < 0` → `index <= 0`)
  return updateExpressionAtPath(expr, path, (current) =>
    keepBinaryOperands(newSubExpr, current),
  );
}

/** 型のツリーエディタで選んだ型の既定の式 (part_type.ts の型の式) */
const TYPE_SELECTIONS: Readonly<Record<string, unknown>> = {
  "expr:type:number": "TypeNumber",
  "expr:type:string": "TypeString",
  "expr:type:boolean": "TypeBoolean",
  "expr:type:type": "TypeType",
  "expr:type:list": { TypeList: { item_type: "TypeNumber" } },
  "expr:type:function": {
    TypeFunction: {
      parameters: [{ name: "x", type: "TypeNumber" }],
      return_type: "TypeNumber",
    },
  },
  "expr:type:record": {
    TypeLiteral: { items: [{ key: "key", value: "TypeString" }] },
  },
  "expr:type:union": {
    TypeUnion: {
      variants: [
        { tag: "a", payload_type: null },
        { tag: "b", payload_type: null },
      ],
    },
  },
};

/** 左右 2 つの式を取る演算の式のキー */
const BINARY_KEYS: ReadonlyArray<string> = [
  "Add",
  "Subtract",
  "Multiply",
  "Divide",
  "Remainder",
  "Equal",
  "NotEqual",
  "LessThan",
  "LessThanOrEqual",
  "GreaterThan",
  "GreaterThanOrEqual",
  "And",
  "Or",
  "StringConcat",
  "ListConcat",
  "BitAnd",
  "BitOr",
  "BitXor",
  "ShiftLeft",
  "ShiftRight",
];

function binaryOperands(expr: unknown): {
  readonly key: string;
  readonly left: unknown;
  readonly right: unknown;
} | null {
  if (!expr || typeof expr !== "object") return null;
  const node = expr as Record<string, unknown>;
  const key = BINARY_KEYS.find((k) => k in node);
  if (key === undefined) return null;
  const inner = node[key] as { left?: unknown; right?: unknown } | null;
  return { key, left: inner?.left, right: inner?.right };
}

/** 新しい式も元の式も二項演算なら, 元の左右の式を新しい式に移す */
export function keepBinaryOperands(next: unknown, current: unknown): unknown {
  const nextOperands = binaryOperands(next);
  const currentOperands = binaryOperands(current);
  if (nextOperands === null || currentOperands === null) {
    return next;
  }
  return {
    [nextOperands.key]: {
      left: currentOperands.left,
      right: currentOperands.right,
    },
  };
}

/** 式全体で使われている変数 ID (let の束縛, 関数のパラメーター, match の束縛) の最大 + 1 */
export function nextVariableId(expr: unknown): number {
  let max = -1;
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === "variable_id" || key === "parameter_id") &&
        typeof child === "number"
      ) {
        max = Math.max(max, child);
      } else {
        walk(child);
      }
    }
  }
  walk(expr);
  return max + 1;
}

import type { PathStep } from "./types.ts";

/**
 * 子の式をフィールド 1 つに持つ式の, パスの段とフィールド名の対応.
 * ast_to_layout.ts の表示とここでの取得・更新で同じ対応を使う
 */
export const FIELD_STEPS: Readonly<
  Record<
    string,
    ReadonlyArray<{ readonly step: string; readonly field: string }>
  >
> = {
  TypeList: [{ step: "typeListItem", field: "item_type" }],
  TypeCode: [{ step: "typeCodeValue", field: "value_type" }],
  Quote: [{ step: "quoteExpression", field: "expression" }],
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

  if (head === "condition" && "If" in node) {
    return getExpressionAtPath(
      (node.If as { condition?: unknown })?.condition,
      tail,
    );
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

  if (head === "condition" && "If" in node) {
    const ifInner = node.If as { condition?: unknown };
    return {
      ...node,
      If: {
        ...ifInner,
        condition: updateExpressionAtPath(ifInner.condition, tail, updater),
      },
    };
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

/** `path` の最後が関数の引数名 ({@link PathStep} の `functionParameter`) なら, その引数の番号 */
export function functionParameterIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === "functionParameter"
    ? last.index
    : null;
}

/**
 * 関数の引数 (`path` は `functionParameter` で終わる) の名前を変える.
 * 本体の変数は ID で引数を参照しているので, 名前だけを変えればよい
 */
export function renameFunctionParameter(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const index = functionParameterIndex(path);
  if (index === null) {
    return expr;
  }
  return updateExpressionAtPath(expr, path.slice(0, -1), (target) => {
    const fn = (target as { readonly Function?: unknown } | null)?.Function as
      | {
          readonly parameters?: ReadonlyArray<
            Readonly<Record<string, unknown>>
          >;
        }
      | undefined;
    if (fn === undefined) {
      return target;
    }
    return {
      Function: {
        ...fn,
        parameters: (fn.parameters ?? []).map((parameter, i) =>
          i === index ? { ...parameter, parameter_name: name } : parameter,
        ),
      },
    };
  });
}

export function clearExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown {
  return updateExpressionAtPath(expr, path, () => ({
    Hole: {},
  }));
}

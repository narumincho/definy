import type { PathStep } from "./types.ts";

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
      bindings?: ReadonlyArray<{
        variable_id?: unknown;
        variable_name?: unknown;
        value?: unknown;
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
      arms?: ReadonlyArray<{
        pattern?: unknown;
        body?: unknown;
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
    newSubExpr = { PartReference: { part_definition_event_hash: partHash } };
  } else {
    return expr;
  }

  return updateExpressionAtPath(expr, path, () => newSubExpr);
}

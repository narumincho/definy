import type { LayoutMode, LayoutNode, NodeKind, PathStep } from "./types.ts";
import { bytesToUrlSafeBase64NoPad, toUint8Array } from "../cbor.ts";

export type ScopeContext = {
  readonly partNames?: ReadonlyMap<string, string>;
  readonly scopeVariables?: ReadonlyMap<number, string>;
  readonly callParameterNames?: ReadonlyMap<string, ReadonlyArray<string>>;
};

function childPath(
  base: ReadonlyArray<PathStep>,
  step: PathStep,
): ReadonlyArray<PathStep> {
  return [...base, step];
}

export function expressionToLayoutNode(
  expr: unknown,
  idPrefix = "root",
  context: ScopeContext = {},
  currentPath: ReadonlyArray<PathStep> = [],
): LayoutNode {
  return buildLayoutNode(expr, idPrefix, currentPath, context);
}

function buildLayoutNode(
  expr: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
): LayoutNode {
  if (expr === null || expr === undefined) {
    return {
      id: idPrefix,
      path: currentPath,
      label: "none",
      kind: "delimiter",
      children: [],
      computedWidth: 32,
      computedHeight: 26,
      layoutMode: "inline",
    };
  }

  if (typeof expr !== "object") {
    return {
      id: idPrefix,
      path: currentPath,
      label: String(expr),
      kind: "identifier",
      children: [],
      computedWidth: 32,
      computedHeight: 26,
      layoutMode: "inline",
    };
  }

  const node = expr as Record<string, unknown>;

  if ("Number" in node) {
    const val = (node.Number as { value?: unknown })?.value ?? 0;
    return {
      id: idPrefix,
      path: currentPath,
      label: String(val),
      kind: "literalNumber",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("String" in node) {
    const val = String((node.String as { value?: unknown })?.value ?? "");
    return {
      id: idPrefix,
      path: currentPath,
      label: `"${val}"`,
      kind: "literalString",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Boolean" in node) {
    const val = Boolean((node.Boolean as { value?: unknown })?.value);
    return {
      id: idPrefix,
      path: currentPath,
      label: val ? "true" : "false",
      kind: "literalBoolean",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Variable" in node) {
    const raw = node.Variable;
    const varId =
      typeof raw === "number"
        ? raw
        : Number((raw as { variable_id?: unknown })?.variable_id ?? 0);
    const varName = context.scopeVariables?.get(varId);
    const label = varName && varName.length > 0 ? varName : `var_${varId}`;
    return {
      id: idPrefix,
      path: currentPath,
      label,
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("PartReference" in node) {
    const raw = (node.PartReference as { part_definition_event_hash?: unknown })
      ?.part_definition_event_hash;
    let label: string;
    if (typeof raw === "object" && raw !== null && "$part" in raw) {
      label = String((raw as { $part: unknown }).$part);
    } else {
      const bytes = toUint8Array(raw);
      const b64 = bytes ? bytesToUrlSafeBase64NoPad(bytes) : null;
      const partName =
        (b64 ? context.partNames?.get(b64) : undefined) ??
        (typeof raw === "string" ? context.partNames?.get(raw) : undefined);
      label = partName ?? `@part:${(b64 ?? String(raw ?? "")).slice(0, 6)}`;
    }
    return {
      id: idPrefix,
      path: currentPath,
      label,
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Hole" in node) {
    return {
      id: idPrefix,
      path: currentPath,
      label: "□",
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  // Binary Operators
  const binaryOps: ReadonlyArray<{
    readonly key: string;
    readonly op: string;
  }> = [
    { key: "Add", op: "plus" },
    { key: "Subtract", op: "minus" },
    { key: "Multiply", op: "multiply" },
    { key: "Divide", op: "divide" },
    { key: "Remainder", op: "remainder" },
    { key: "Equal", op: "equal" },
    { key: "NotEqual", op: "not-equal" },
    { key: "LessThan", op: "less-than" },
    { key: "LessThanOrEqual", op: "less-than-or-equal" },
    { key: "GreaterThan", op: "greater-than" },
    { key: "GreaterThanOrEqual", op: "greater-than-or-equal" },
    { key: "And", op: "and" },
    { key: "Or", op: "or" },
    { key: "StringConcat", op: "string-concat" },
    { key: "ListConcat", op: "list-concat" },
    { key: "BitAnd", op: "bit-and" },
    { key: "BitOr", op: "bit-or" },
    { key: "BitXor", op: "bit-xor" },
    { key: "ShiftLeft", op: "shift-left" },
    { key: "ShiftRight", op: "shift-right" },
  ];

  for (const { key, op } of binaryOps) {
    if (key in node) {
      const inner = node[key] as { left?: unknown; right?: unknown };
      const leftChild = buildLayoutNode(
        inner?.left,
        `${idPrefix}.left`,
        childPath(currentPath, "left"),
        context,
      );
      const rightChild = buildLayoutNode(
        inner?.right,
        `${idPrefix}.right`,
        childPath(currentPath, "right"),
        context,
      );
      return {
        id: idPrefix,
        path: currentPath,
        label: op,
        kind: "operator",
        children: [leftChild, rightChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
    }
  }

  if ("Not" in node) {
    const inner = (node.Not as { value?: unknown })?.value;
    const child = buildLayoutNode(
      inner,
      `${idPrefix}.val`,
      childPath(currentPath, "condition"),
      context,
    );
    return {
      id: idPrefix,
      path: currentPath,
      label: "not",
      kind: "operator",
      children: [child],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("If" in node) {
    const ifNode = node.If as {
      condition?: unknown;
      then_expr?: unknown;
      then?: unknown;
      else_expr?: unknown;
      else?: unknown;
    };
    const condChild = buildLayoutNode(
      ifNode.condition,
      `${idPrefix}.cond`,
      childPath(currentPath, "condition"),
      context,
    );
    const thenChild = buildLayoutNode(
      ifNode.then_expr ?? ifNode.then,
      `${idPrefix}.then`,
      childPath(currentPath, "then"),
      context,
    );
    const elseChild = buildLayoutNode(
      ifNode.else_expr ?? ifNode.else,
      `${idPrefix}.else`,
      childPath(currentPath, "else"),
      context,
    );
    return {
      id: idPrefix,
      path: currentPath,
      label: "if",
      kind: "block",
      children: [condChild, thenChild, elseChild],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };
  }

  if ("Let" in node) {
    const letNode = node.Let as {
      readonly bindings?: ReadonlyArray<{
        readonly variable_id?: unknown;
        readonly variable_name?: unknown;
        readonly value?: unknown;
      }>;
      readonly variable_id?: unknown;
      readonly variable_name?: unknown;
      readonly value?: unknown;
      readonly body?: unknown;
    };

    let nextScopeVars = new Map<number, string>(context.scopeVariables ?? []);
    const bindingNodes: LayoutNode[] = [];

    if (Array.isArray(letNode.bindings)) {
      for (const [idx, b] of letNode.bindings.entries()) {
        const varId = Number(b.variable_id ?? 0);
        const varName = String(b.variable_name ?? `v${varId}`);
        const bindingPath = childPath(currentPath, {
          kind: "letBindingValue",
          index: idx,
        });
        const valChild = buildLayoutNode(
          b.value,
          `${idPrefix}.b_${idx}.val`,
          bindingPath,
          { ...context, scopeVariables: nextScopeVars },
        );
        const nameChild: LayoutNode = {
          id: `${idPrefix}.b_${idx}.name`,
          path: bindingPath,
          label: varName,
          kind: "identifier",
          children: [],
          computedWidth: 0,
          computedHeight: 0,
          layoutMode: "inline",
        };
        bindingNodes.push({
          id: `${idPrefix}.b_${idx}`,
          path: bindingPath,
          label: "=",
          kind: "operator",
          children: [nameChild, valChild],
          computedWidth: 0,
          computedHeight: 0,
          layoutMode: "inline",
        });
        nextScopeVars.set(varId, varName);
      }
    } else if (letNode.value !== undefined) {
      const varId = Number(letNode.variable_id ?? 0);
      const varName = String(letNode.variable_name ?? `v${varId}`);
      const bindingPath = childPath(currentPath, "letValue");
      const valChild = buildLayoutNode(
        letNode.value,
        `${idPrefix}.b_0.val`,
        bindingPath,
        context,
      );
      const nameChild: LayoutNode = {
        id: `${idPrefix}.b_0.name`,
        path: bindingPath,
        label: varName,
        kind: "identifier",
        children: [],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
      bindingNodes.push({
        id: `${idPrefix}.b_0`,
        path: bindingPath,
        label: "=",
        kind: "operator",
        children: [nameChild, valChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      });
      nextScopeVars.set(varId, varName);
    }

    const bindingsGroup: LayoutNode = {
      id: `${idPrefix}.bindings`,
      path: currentPath,
      label: "list",
      kind: "block",
      children: bindingNodes,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };

    const bodyChild = buildLayoutNode(
      letNode.body,
      `${idPrefix}.body`,
      childPath(currentPath, "letBody"),
      { ...context, scopeVariables: nextScopeVars },
    );

    return {
      id: idPrefix,
      path: currentPath,
      label: "let",
      kind: "block",
      children: [bindingsGroup, bodyChild],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };
  }

  if ("Function" in node) {
    const fnNode = node.Function as {
      readonly parameters?: ReadonlyArray<{
        readonly parameter_id?: unknown;
        readonly parameter_name?: unknown;
        readonly name?: unknown;
        readonly variable_id?: unknown;
      }>;
      readonly body?: unknown;
    };
    const params = fnNode.parameters ?? [];
    let nextScopeVars = new Map<number, string>(context.scopeVariables ?? []);
    const paramChildren: LayoutNode[] = [];

    for (const [idx, p] of params.entries()) {
      const pId = Number(p.parameter_id ?? p.variable_id ?? 0);
      const pName = String(p.parameter_name ?? p.name ?? `arg${idx}`);
      nextScopeVars.set(pId, pName);
      paramChildren.push({
        id: `${idPrefix}.param_${idx}`,
        path: childPath(currentPath, {
          kind: "typeFunctionParameter",
          index: idx,
        }),
        label: pName,
        kind: "identifier",
        children: [],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      });
    }

    const bodyChild = buildLayoutNode(
      fnNode.body,
      `${idPrefix}.body`,
      childPath(currentPath, "functionBody"),
      { ...context, scopeVariables: nextScopeVars },
    );

    return {
      id: idPrefix,
      path: currentPath,
      label: "fn",
      kind: "block",
      children: [...paramChildren, bodyChild],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };
  }

  if ("Call" in node) {
    const callNode = node.Call as {
      function?: unknown;
      arguments?: ReadonlyArray<{ name?: unknown; value?: unknown }>;
    };
    const fnChild = buildLayoutNode(
      callNode.function,
      `${idPrefix}.fn`,
      childPath(currentPath, "callFunction"),
      context,
    );
    const args = callNode.arguments ?? [];
    const argChildren: LayoutNode[] = [];

    for (const [idx, arg] of args.entries()) {
      const argPath = childPath(currentPath, {
        kind: "callArgument",
        index: idx,
      });
      const valChild = buildLayoutNode(
        arg.value,
        `${idPrefix}.arg_${idx}.val`,
        argPath,
        context,
      );
      const argName = String(arg.name ?? "");
      const label = argName.length > 0 ? `${argName}:` : `arg${idx}:`;
      argChildren.push({
        id: `${idPrefix}.arg_${idx}`,
        path: argPath,
        label,
        kind: "identifier",
        children: [valChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      });
    }

    return {
      id: idPrefix,
      path: currentPath,
      label: "call",
      kind: "group",
      children: [fnChild, ...argChildren],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("ListLiteral" in node) {
    const listNode = node.ListLiteral as {
      items?: ReadonlyArray<unknown>;
    };
    const items = listNode.items ?? [];

    // スプレッドシート型 (Table) の自動判定
    const tableInfo = tryBuildTable(items, idPrefix, currentPath, context);
    if (tableInfo) {
      return tableInfo;
    }

    if (items.length === 0) {
      return {
        id: idPrefix,
        path: currentPath,
        label: "[]",
        kind: "group",
        children: [],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
    }

    const children = items.map((item, idx) =>
      buildLayoutNode(
        item,
        `${idPrefix}.item_${idx}`,
        childPath(currentPath, { kind: "listItemValue", index: idx }),
        context,
      ),
    );

    return {
      id: idPrefix,
      path: currentPath,
      label: "list",
      kind: "group",
      children,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("TypeLiteral" in node || "RecordLiteral" in node) {
    const recNode = (node.TypeLiteral ?? node.RecordLiteral) as {
      items?: ReadonlyArray<{ key?: unknown; name?: unknown; value?: unknown }>;
    };
    const items = recNode.items ?? [];
    const children = items.map((field, idx) => {
      const k = String(field.key ?? field.name ?? "");
      const fPath = childPath(currentPath, {
        kind: "recordItemValue",
        index: idx,
      });
      const valChild = buildLayoutNode(
        field.value,
        `${idPrefix}.field_${idx}.val`,
        fPath,
        context,
      );
      return {
        id: `${idPrefix}.field_${idx}`,
        path: fPath,
        label: k,
        kind: "identifier" as NodeKind,
        children: [valChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline" as LayoutMode,
      };
    });

    return {
      id: idPrefix,
      path: currentPath,
      label: "record",
      kind: "group",
      children,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("RecordGet" in node) {
    const getRec = node.RecordGet as {
      record?: unknown;
      key?: unknown;
      field_name?: unknown;
    };
    const recChild = buildLayoutNode(
      getRec.record,
      `${idPrefix}.rec`,
      childPath(currentPath, "record"),
      context,
    );
    const key = String(getRec.key ?? getRec.field_name ?? "");
    return {
      id: idPrefix,
      path: currentPath,
      label: `.${key}`,
      kind: "identifier",
      children: [recChild],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Variant" in node) {
    const varNode = node.Variant as { tag?: unknown; payload?: unknown };
    const tag = String(varNode.tag ?? "");
    const children =
      varNode.payload != null
        ? [
            buildLayoutNode(
              varNode.payload,
              `${idPrefix}.payload`,
              childPath(currentPath, "variantPayload"),
              context,
            ),
          ]
        : [];
    return {
      id: idPrefix,
      path: currentPath,
      label: tag,
      kind: "group",
      children,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Constructor" in node) {
    const ctorNode = node.Constructor as {
      type_part_definition_event_hash?: unknown;
      value?: unknown;
    };
    const hashStr = String(ctorNode.type_part_definition_event_hash ?? "");
    const label = `new:${hashStr.slice(0, 6)}`;
    const child = buildLayoutNode(
      ctorNode.value,
      `${idPrefix}.val`,
      childPath(currentPath, "constructorValue"),
      context,
    );
    return {
      id: idPrefix,
      path: currentPath,
      label,
      kind: "group",
      children: [child],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Match" in node) {
    const matchNode = node.Match as {
      readonly target?: unknown;
      readonly arms?: ReadonlyArray<{
        readonly tag?: unknown;
        readonly variable_id?: unknown;
        readonly variable_name?: unknown;
        readonly body?: unknown;
      }>;
      readonly default?: unknown;
    };
    const targetChild = buildLayoutNode(
      matchNode.target,
      `${idPrefix}.target`,
      childPath(currentPath, "matchTarget"),
      context,
    );
    const armChildren: LayoutNode[] = [];
    const arms = matchNode.arms ?? [];

    for (const [idx, arm] of arms.entries()) {
      const armTag = String(arm.tag ?? "");
      const armVarId =
        arm.variable_id != null ? Number(arm.variable_id) : undefined;
      const armVarName =
        arm.variable_name != null
          ? String(arm.variable_name)
          : armVarId != null
            ? `v${armVarId}`
            : undefined;

      const armContext =
        armVarId != null && armVarName != null
          ? {
              ...context,
              scopeVariables: new Map([
                ...(context.scopeVariables ?? []),
                [armVarId, armVarName],
              ]),
            }
          : context;

      const armPath = childPath(currentPath, {
        kind: "matchArmBody",
        index: idx,
      });
      const bodyChild = buildLayoutNode(
        arm.body,
        `${idPrefix}.arm_${idx}.body`,
        armPath,
        armContext,
      );
      const label = armVarName ? `${armTag}(${armVarName}) =>` : `${armTag} =>`;
      armChildren.push({
        id: `${idPrefix}.arm_${idx}`,
        path: armPath,
        label,
        kind: "block",
        children: [bodyChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "multiline",
      });
    }

    if (matchNode.default != null) {
      const defPath = childPath(currentPath, "matchDefault");
      const defBody = buildLayoutNode(
        matchNode.default,
        `${idPrefix}.default.body`,
        defPath,
        context,
      );
      armChildren.push({
        id: `${idPrefix}.default`,
        path: defPath,
        label: "_ =>",
        kind: "block",
        children: [defBody],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "multiline",
      });
    }

    return {
      id: idPrefix,
      path: currentPath,
      label: "match",
      kind: "block",
      children: [targetChild, ...armChildren],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };
  }

  // Fallback for unknown object variants
  const firstKey = Object.keys(node)[0] ?? "unknown";
  return {
    id: idPrefix,
    path: currentPath,
    label: firstKey,
    kind: "keyword",
    children: [],
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "inline",
  };
}

function tryBuildTable(
  items: ReadonlyArray<unknown>,
  idPrefix: string,
  basePath: ReadonlyArray<PathStep>,
  context: ScopeContext,
): LayoutNode | null {
  if (items.length < 2) return null;

  const allKeys: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    const inner = (rec.TypeLiteral ?? rec.RecordLiteral) as
      | {
          items?: ReadonlyArray<{ key?: unknown; name?: unknown }>;
        }
      | undefined;
    if (!inner || !Array.isArray(inner.items) || inner.items.length === 0) {
      return null;
    }
    for (const f of inner.items) {
      const k = String(f.key ?? f.name ?? "");
      if (!allKeys.includes(k)) {
        allKeys.push(k);
      }
    }
  }

  if (allKeys.length === 0) return null;

  const rows: LayoutNode[] = [];
  for (const [rowIdx, item] of items.entries()) {
    const rec =
      (item as Record<string, unknown>).TypeLiteral ??
      (item as Record<string, unknown>).RecordLiteral;
    const fields =
      (rec as { items?: ReadonlyArray<Record<string, unknown>> }).items ?? [];
    const rowCells: LayoutNode[] = [];

    for (const [colIdx, key] of allKeys.entries()) {
      const fieldIdx = fields.findIndex(
        (f) => String(f.key ?? f.name ?? "") === key,
      );
      if (fieldIdx >= 0) {
        const field = fields[fieldIdx];
        const cellPath = childPath(
          childPath(basePath, { kind: "listItemValue", index: rowIdx }),
          { kind: "recordItemValue", index: fieldIdx },
        );
        rowCells.push(
          buildLayoutNode(
            field?.value,
            `${idPrefix}.r${rowIdx}.c${colIdx}`,
            cellPath,
            context,
          ),
        );
      } else {
        rowCells.push({
          id: `${idPrefix}.r${rowIdx}.c${colIdx}.none`,
          path: childPath(basePath, { kind: "listItemValue", index: rowIdx }),
          label: "-",
          kind: "delimiter",
          children: [],
          computedWidth: 20,
          computedHeight: 26,
          layoutMode: "inline",
        });
      }
    }

    rows.push({
      id: `${idPrefix}.row_${rowIdx}`,
      path: childPath(basePath, { kind: "listItemValue", index: rowIdx }),
      label: `row ${rowIdx + 1}`,
      kind: "group",
      children: rowCells,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    });
  }

  return {
    id: idPrefix,
    path: basePath,
    label: "table",
    kind: "table",
    children: rows,
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "multiline",
    tableHeaders: allKeys,
  };
}

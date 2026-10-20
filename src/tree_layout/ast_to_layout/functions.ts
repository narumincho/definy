import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";

export function tryBuildFunctionNode(
  node: Record<string, unknown>,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
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
    const paramChildren: ReadonlyArray<LayoutNode> = params.map((p, idx) => {
      const pId = Number(p.parameter_id ?? p.variable_id ?? 0);
      const pName = String(p.parameter_name ?? p.name ?? `arg${idx}`);
      nextScopeVars.set(pId, pName);
      return {
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
      };
    });

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
    const argChildren: ReadonlyArray<LayoutNode> = args.map((arg, idx) => {
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
      return {
        id: `${idPrefix}.arg_${idx}`,
        path: argPath,
        label,
        kind: "identifier",
        children: [valChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
    });

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

  return null;
}

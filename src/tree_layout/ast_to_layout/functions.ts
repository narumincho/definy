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
          label: "",
          kind: "group",
          children: [
            nameChild,
            letEqualSign(`${idPrefix}.b_${idx}.eq`, bindingPath),
            valChild,
          ],
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
        label: "",
        kind: "group",
        children: [
          nameChild,
          letEqualSign(`${idPrefix}.b_0.eq`, bindingPath),
          valChild,
        ],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      });
      nextScopeVars.set(varId, varName);
    }

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
      // 束縛を並べ, 最後に本体を置く
      children: [...bindingNodes, bodyChild],
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
          kind: "functionParameter",
          index: idx,
        }),
        label: pName,
        kind: "parameterName",
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
    // 呼び出す関数は式ではなく呼び出しの一部 (呼び出しは必ずパーツ名か関数型の引数で始まる).
    // 名前のノードは呼び出しと同じパスにして, 名前を選ぶと呼び出し全体を選ぶ
    const fnChild: LayoutNode = {
      id: `${idPrefix}.fn`,
      path: currentPath,
      label: calleeLabel(callNode.function, idPrefix, context, buildLayoutNode),
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
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

    // 見出しは出さない. 呼び出す関数と引数の並びで呼び出しだと分かる.
    // 呼び出し自体は, 呼び出す関数の名前かカプセルの枠をクリック・ホバーして選ぶ
    return {
      id: idPrefix,
      path: currentPath,
      label: "",
      kind: "group",
      children: [fnChild, ...argChildren],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  return null;
}

/**
 * let の束縛の `名前 = 値` の `=`.
 * 束縛には見出しのバッジを出さず, 名前と値の間にこの記号を置く
 */
function letEqualSign(
  id: string,
  bindingPath: ReadonlyArray<PathStep>,
): LayoutNode {
  return {
    id,
    path: bindingPath,
    label: "=",
    kind: "delimiter",
    children: [],
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "inline",
  };
}

/**
 * 呼び出す関数の名前. パーツはパーツ名, 関数型の引数は引数名, レコードの関数のフィールドは `clock.now` のように出す
 */
function calleeLabel(
  callee: unknown,
  idPrefix: string,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): string {
  const recordGet = (
    callee as {
      readonly RecordGet?: {
        readonly record?: unknown;
        readonly key?: unknown;
      };
    } | null
  )?.RecordGet;
  if (recordGet !== undefined) {
    return `${calleeLabel(recordGet.record, idPrefix, context, buildLayoutNode)}.${String(recordGet.key ?? "")}`;
  }
  return buildLayoutNode(callee, `${idPrefix}.fn`, [], context).label;
}

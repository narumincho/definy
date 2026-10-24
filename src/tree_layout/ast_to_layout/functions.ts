import type { LayoutNode, PathStep } from "../types.ts";
import { variantPayload } from "../../definy_value.ts";
import { callOf, letChainOf } from "../expression.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";

export function tryBuildFunctionNode(
  node: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
  const letChainNode = letChainOf(node);
  if (letChainNode !== undefined) {
    const nextScopeVars = new Map<number, string>(context.scopeVariables ?? []);
    const bindingNodes: LayoutNode[] = [];

    for (const [idx, b] of letChainNode.bindings.entries()) {
      const varId = b.variable_id;
      const varName =
        b.variable_name.length > 0 ? b.variable_name : `v${varId}`;
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
      // 変数名を選ぶとその場で名前を変えられる (関数の引数名と同じ)
      const nameChild: LayoutNode = {
        id: `${idPrefix}.b_${idx}.name`,
        path: childPath(currentPath, { kind: "letBindingName", index: idx }),
        label: varName,
        kind: "parameterName",
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

    const bodyChild = buildLayoutNode(
      letChainNode.body,
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

  const fnNode = variantPayload(node, "function") as
    | {
        readonly parameters?: ReadonlyArray<{
          readonly parameter_id?: unknown;
          readonly parameter_name?: unknown;
        }>;
        readonly body?: unknown;
      }
    | undefined;
  if (fnNode !== undefined) {
    const params = fnNode.parameters ?? [];
    const nextScopeVars = new Map<number, string>(context.scopeVariables ?? []);
    const paramChildren: ReadonlyArray<LayoutNode> = params.map((p, idx) => {
      const pId = Number(p.parameter_id ?? 0);
      const pName = String(p.parameter_name ?? `arg${idx}`);
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

  const callNode = callOf(node);
  if (callNode !== undefined) {
    // 呼び出す関数は式ではなく呼び出しの一部 (呼び出しは必ずパーツ名か関数型の引数で始まる).
    // 名前のノードは呼び出しと同じパスにして, 名前を選ぶと呼び出し全体を選ぶ
    const fnChild: LayoutNode = {
      id: `${idPrefix}.fn`,
      path: currentPath,
      label: calleeLabel(callNode.callee, idPrefix, context, buildLayoutNode),
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
    const args = callNode.arguments;
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
  const recordGet = variantPayload(callee, "record_get") as
    | {
        readonly record?: unknown;
        readonly key?: unknown;
      }
    | undefined;
  if (recordGet !== undefined) {
    return `${calleeLabel(recordGet.record, idPrefix, context, buildLayoutNode)}.${String(recordGet.key ?? "")}`;
  }
  return buildLayoutNode(callee, `${idPrefix}.fn`, [], context).label;
}

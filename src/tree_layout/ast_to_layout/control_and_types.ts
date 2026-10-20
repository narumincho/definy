import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";
import { FIELD_STEPS } from "../mutation.ts";

/** FIELD_STEPS の式の表示名 */
const FIELD_STEP_LABELS: Readonly<Record<string, string>> = {
  ListGet: "list-get",
  ListAppend: "list-append",
  ListLength: "list-length",
  StringLength: "string-length",
  StringToBytes: "string-to-bytes",
  StringSlice: "string-slice",
  TypeList: "List",
};

export function tryBuildControlOrTypeNode(
  node: Record<string, unknown>,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
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

  if ("TypeFunction" in node) {
    const fn = (node.TypeFunction ?? {}) as {
      readonly parameters?: ReadonlyArray<{
        readonly name?: unknown;
        readonly type?: unknown;
      }>;
      readonly return_type?: unknown;
    };
    const parameterNodes = (fn.parameters ?? []).map(
      (parameter, index): LayoutNode => {
        const parameterPath = childPath(currentPath, {
          kind: "typeFunctionParameter",
          index,
        });
        return {
          id: `${idPrefix}.p_${index}`,
          path: parameterPath,
          label: `${String(parameter.name ?? "")}:`,
          kind: "identifier",
          children: [
            buildLayoutNode(
              parameter.type,
              `${idPrefix}.p_${index}.type`,
              parameterPath,
              context,
            ),
          ],
          computedWidth: 0,
          computedHeight: 0,
          layoutMode: "inline",
        };
      },
    );
    const returnPath = childPath(currentPath, "typeFunctionReturn");
    return {
      id: idPrefix,
      path: currentPath,
      label: "function",
      kind: "keyword",
      children: [
        ...parameterNodes,
        {
          id: `${idPrefix}.return`,
          path: returnPath,
          label: "→",
          kind: "operator",
          children: [
            buildLayoutNode(
              fn.return_type,
              `${idPrefix}.return.type`,
              returnPath,
              context,
            ),
          ],
          computedWidth: 0,
          computedHeight: 0,
          layoutMode: "inline",
        },
      ],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  // list-get, string-slice など, 子の式をフィールドに持つ組み込みの式
  for (const [key, steps] of Object.entries(FIELD_STEPS)) {
    if (key in node) {
      const inner = (node[key] ?? {}) as Record<string, unknown>;
      return {
        id: idPrefix,
        path: currentPath,
        label: FIELD_STEP_LABELS[key] ?? key,
        kind: key === "TypeList" ? "keyword" : "operator",
        children: steps.map(({ step, field }) =>
          buildLayoutNode(
            inner[field],
            `${idPrefix}.${field}`,
            childPath(currentPath, step as PathStep),
            context,
          ),
        ),
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
    }
  }

  if ("TypeUnion" in node) {
    const variants =
      (
        node.TypeUnion as {
          variants?: ReadonlyArray<{
            readonly tag?: unknown;
            readonly payload_type?: unknown;
          }>;
        } | null
      )?.variants ?? [];
    return {
      id: idPrefix,
      path: currentPath,
      label: "union",
      kind: "block",
      children: variants.map((variant, index) => {
        const tag = String(variant.tag ?? "");
        // ペイロードのないバリアントは式を持たないので, 選ぶと union 全体を選ぶ
        if (variant.payload_type == null) {
          return {
            id: `${idPrefix}.v_${index}`,
            path: currentPath,
            label: tag,
            kind: "identifier" as const,
            children: [],
            computedWidth: 0,
            computedHeight: 0,
            layoutMode: "inline" as const,
          };
        }
        const variantPath = childPath(currentPath, {
          kind: "typeUnionVariant",
          index,
        });
        return {
          id: `${idPrefix}.v_${index}`,
          path: variantPath,
          label: `${tag}:`,
          kind: "keyword" as const,
          children: [
            buildLayoutNode(
              variant.payload_type,
              `${idPrefix}.v_${index}.payload`,
              variantPath,
              context,
            ),
          ],
          computedWidth: 0,
          computedHeight: 0,
          layoutMode: "inline" as const,
        };
      }),
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "multiline",
    };
  }

  return null;
}

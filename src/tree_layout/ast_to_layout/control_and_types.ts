import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";
import { FIELD_STEPS } from "../mutation.ts";
import { field, optionValue, variantOf } from "../../definy_value.ts";
import {
  armBindsVariable,
  matchOf,
  patternBoundVariables,
  patternLabel,
  patternOfArm,
} from "../expression.ts";

/** FIELD_STEPS の式の表示名 */
const FIELD_STEP_LABELS: Readonly<Record<string, string>> = {
  type_list: "List",
  type_code: "Code",
  quote: "quote",
};

export function tryBuildControlOrTypeNode(
  node: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
  const tagged = variantOf(node);
  if (tagged === undefined) {
    return null;
  }
  const { tag, payload } = tagged;

  const matchNode = matchOf(node);
  if (matchNode !== undefined) {
    const targetChild = buildLayoutNode(
      matchNode.target,
      `${idPrefix}.target`,
      childPath(currentPath, "matchTarget"),
      context,
    );
    const armChildren: LayoutNode[] = [];

    for (const [idx, arm] of matchNode.arms.entries()) {
      const pattern = patternOfArm(arm);
      // 1 段のパターンで束縛する変数は名前を別のノードにして, その場で名前を変えられるようにする
      const binds = armBindsVariable(arm);
      const armVarId = Number(arm.variable_id);
      const armVarName =
        arm.variable_name.length > 0 ? arm.variable_name : `v${armVarId}`;
      const patternText =
        arm.kind === "bind" ? "_" : binds ? arm.tag : patternLabel(pattern);
      const bound = patternBoundVariables(pattern);

      const armContext =
        bound.length > 0
          ? {
              ...context,
              scopeVariables: new Map([
                ...(context.scopeVariables ?? []),
                ...bound.map(
                  ({ id, name }) =>
                    [id, name.length > 0 ? name : `v${id}`] as const,
                ),
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
      // パターンのノード (タグ) を選ぶとタグを変えるメニュー, 束縛する変数の名前を選ぶとその場で名前を変えられる
      const variableChildren: ReadonlyArray<LayoutNode> = binds
        ? [
            {
              id: `${idPrefix}.arm_${idx}.variable`,
              path: childPath(currentPath, {
                kind: "matchArmVariable",
                index: idx,
              }),
              label: armVarName,
              kind: "parameterName",
              children: [],
              computedWidth: 0,
              computedHeight: 0,
              layoutMode: "inline",
            },
          ]
        : [];
      armChildren.push({
        id: `${idPrefix}.arm_${idx}`,
        path: childPath(currentPath, { kind: "matchArmPattern", index: idx }),
        label: `${patternText} =>`,
        kind: "block",
        children: [...variableChildren, bodyChild],
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

  if (tag === "type_function") {
    const fn = (payload ?? {}) as {
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
          kind: "symbol",
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

  // List<T> など, 子の式をフィールドに持つ式
  const steps = FIELD_STEPS[tag];
  if (steps !== undefined) {
    // quote の中の式は外の変数を使えないので, 外のスコープを見せない
    const innerContext: ScopeContext =
      tag === "quote" ? { ...context, scopeVariables: new Map() } : context;
    return {
      id: idPrefix,
      path: currentPath,
      label: FIELD_STEP_LABELS[tag] ?? tag,
      kind: "keyword",
      children: steps.map(({ step, field: key }) =>
        buildLayoutNode(
          key === null ? payload : field(payload, key),
          `${idPrefix}.${key ?? "expression"}`,
          childPath(currentPath, step as PathStep),
          innerContext,
        ),
      ),
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if (tag === "type_union") {
    const variants: ReadonlyArray<{
      readonly tag?: unknown;
      readonly payload_type?: unknown;
    }> = Array.isArray(payload) ? payload : [];
    return {
      id: idPrefix,
      path: currentPath,
      label: "union",
      kind: "block",
      children: variants.map((variant, index) => {
        const variantTag = String(variant.tag ?? "");
        const payloadType = optionValue(variant.payload_type);
        // ペイロードのないバリアントは式を持たないので, 選ぶと union 全体を選ぶ
        if (payloadType === undefined) {
          return {
            id: `${idPrefix}.v_${index}`,
            path: currentPath,
            label: variantTag,
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
          label: `${variantTag}:`,
          kind: "keyword" as const,
          children: [
            buildLayoutNode(
              payloadType,
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

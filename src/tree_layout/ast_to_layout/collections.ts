import type { LayoutNode, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";
import { tryBuildTable } from "./table.ts";
import { field, optionValue, variantOf } from "../../definy_value.ts";

export function tryBuildCollectionNode(
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

  if (tag === "list") {
    const items: ReadonlyArray<unknown> = Array.isArray(payload) ? payload : [];

    // スプレッドシート型 (Table) の自動判定
    const tableInfo = tryBuildTable(
      items,
      idPrefix,
      currentPath,
      context,
      buildLayoutNode,
    );
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

  // レコードの式とレコード型の宣言 (型パーツ) は同じ形 `[{ key, value }]`
  if (tag === "record" || tag === "type_record") {
    const items: ReadonlyArray<{
      readonly key?: unknown;
      readonly value?: unknown;
    }> = Array.isArray(payload) ? payload : [];
    // フィールド名を選ぶとその場で名前を変えられる (let の変数名と同じ)
    const children = items.map((field, idx): LayoutNode => {
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
      const keyChild: LayoutNode = {
        id: `${idPrefix}.field_${idx}.key`,
        path: childPath(currentPath, { kind: "recordItemKey", index: idx }),
        label: String(field.key ?? ""),
        kind: "parameterName",
        children: [],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
      };
      return {
        id: `${idPrefix}.field_${idx}`,
        path: fPath,
        label: "",
        kind: "group",
        children: [keyChild, valChild],
        computedWidth: 0,
        computedHeight: 0,
        layoutMode: "inline",
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

  if (tag === "record_get") {
    const getRec = payload as {
      readonly record?: unknown;
      readonly key?: unknown;
    };
    const recChild = buildLayoutNode(
      getRec.record,
      `${idPrefix}.rec`,
      childPath(currentPath, "record"),
      context,
    );
    // フィールド名を選ぶとその場で名前を変えられる
    const keyChild: LayoutNode = {
      id: `${idPrefix}.key`,
      path: childPath(currentPath, "recordGetKey"),
      label: String(getRec.key ?? ""),
      kind: "parameterName",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
    // `p.key` のように並べる
    const dot: LayoutNode = {
      id: `${idPrefix}.dot`,
      path: currentPath,
      label: ".",
      kind: "delimiter",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
    return {
      id: idPrefix,
      path: currentPath,
      label: "",
      kind: "group",
      children: [recChild, dot, keyChild],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if (tag === "variant") {
    const variantTag = String(field(payload, "tag") ?? "");
    const variantPayloadExpression = optionValue(field(payload, "payload"));
    const children =
      variantPayloadExpression !== undefined
        ? [
            buildLayoutNode(
              variantPayloadExpression,
              `${idPrefix}.payload`,
              childPath(currentPath, "variantPayload"),
              context,
            ),
          ]
        : [];
    return {
      id: idPrefix,
      path: currentPath,
      label: variantTag,
      kind: "group",
      children,
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  return null;
}

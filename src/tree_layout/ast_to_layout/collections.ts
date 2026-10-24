import type { LayoutMode, LayoutNode, NodeKind, PathStep } from "../types.ts";
import {
  type BuildLayoutNodeFn,
  childPath,
  type ScopeContext,
} from "./types.ts";
import { tryBuildTable } from "./table.ts";

export function tryBuildCollectionNode(
  node: Record<string, unknown>,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
  buildLayoutNode: BuildLayoutNodeFn,
): LayoutNode | null {
  if ("ListLiteral" in node) {
    const listNode = node.ListLiteral as {
      items?: ReadonlyArray<unknown>;
    };
    const items = listNode.items ?? [];

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

  return null;
}

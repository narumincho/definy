import { useCallback, useMemo, useState, type JSX } from "react";
import { computeLayout, expressionToLayoutNode } from "./engine.ts";
import { TreeLayoutRenderer } from "./TreeLayoutRenderer.tsx";
import { typeAstToExpression } from "./part_type.ts";
import { useDefiny } from "../state.tsx";

export type TypeTreeViewProps = {
  /** 表示する型 (`core.type-ast` の値) */
  readonly type: unknown;
  /** 1 行に収める幅の目安 (px). 超えると式と同じように縦に並べる */
  readonly maxWidth?: number;
};

/**
 * 型 (`core.type-ast` の値) を, 式と同じツリー表示エンジン (engine.ts + TreeLayoutRenderer) で読み取り専用で表示する.
 * ホバーカードの型や置換メニューの期待する型の表示に使う (docs/ui.md「型の表示」)
 */
export function TypeTreeView({
  type,
  maxWidth = 420,
}: TypeTreeViewProps): JSX.Element {
  const { partNames } = useDefiny();
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const layoutRoot = useMemo(
    () =>
      computeLayout(
        // 式のツリーと data-node-id が重ならないよう, ID の先頭を変える
        expressionToLayoutNode(typeAstToExpression(type), "type-view", {
          partNames,
        }),
        { maxWidth },
      ),
    [type, partNames, maxWidth],
  );
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  return (
    <div className="type-tree-view">
      <TreeLayoutRenderer
        node={layoutRoot}
        editable={false}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
      />
    </div>
  );
}

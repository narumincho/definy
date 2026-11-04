import { pathToString, type LayoutNode, type PathStep } from "./types.ts";

/**
 * 部分木に入っているノードの ID とパス (行きがけ順の番号で引く). 選択やホバーが変わったとき,
 * それを含まない部分木の描画を飛ばすのに使う (ID もパスも親子で入れ子になるとは限らないので番号で比べる)
 */
export type SubtreeIndex = {
  /** ノード → 部分木の行きがけ順の番号の範囲 [start, end] */
  readonly ranges: WeakMap<LayoutNode, readonly [number, number]>;
  /** ID → その ID のノードの番号 */
  readonly idOrders: ReadonlyMap<string, ReadonlyArray<number>>;
  /** パス (`pathToString`) → そのパスのノードの番号 */
  readonly pathOrders: ReadonlyMap<string, ReadonlyArray<number>>;
};

export function buildSubtreeIndex(root: LayoutNode): SubtreeIndex {
  const ranges = new WeakMap<LayoutNode, readonly [number, number]>();
  const idOrders = new Map<string, number[]>();
  const pathOrders = new Map<string, number[]>();
  let order = 0;
  const push = (map: Map<string, number[]>, key: string, value: number) => {
    const list = map.get(key);
    if (list === undefined) map.set(key, [value]);
    else list.push(value);
  };
  const visit = (node: LayoutNode): void => {
    const start = order++;
    push(idOrders, node.id, start);
    push(pathOrders, pathToString(node.path), start);
    for (const child of node.children) visit(child);
    ranges.set(node, [start, order - 1]);
  };
  visit(root);
  return { ranges, idOrders, pathOrders };
}

function subtreeContains(
  index: SubtreeIndex,
  node: LayoutNode,
  orders: ReadonlyMap<string, ReadonlyArray<number>>,
  key: string | null | undefined,
): boolean {
  if (key == null) return false;
  const range = index.ranges.get(node);
  if (range === undefined) return true;
  return (orders.get(key) ?? []).some((o) => o >= range[0] && o <= range[1]);
}

/** 部分木の描画に効く props. {@link sameSubtreeProps} で前と比べる */
type SubtreeProps = {
  readonly node: LayoutNode;
  readonly index: SubtreeIndex;
  readonly collapsedIds: ReadonlySet<string>;
  readonly inlineEdit?: boolean;
  readonly editable?: boolean;
  readonly selectionAnchorName?: string;
  readonly selectedPath?: ReadonlyArray<PathStep> | null;
  readonly hoveredId?: string | null;
  readonly linkNodeId?: string | null;
  readonly typeErrorNodeId?: string | null;
  readonly typeErrorMessage?: string;
};

/**
 * 部分木の描画が前と変わらないか (`memo` の比較). 関数の props は変わらないものにしておく前提で比べない.
 * 選択・ホバーなどは, 前か後の値のノードがこの部分木にあるときだけ描画し直す
 */
export function sameSubtreeProps(
  prev: SubtreeProps,
  next: SubtreeProps,
): boolean {
  if (
    prev.node !== next.node ||
    prev.collapsedIds !== next.collapsedIds ||
    prev.inlineEdit !== next.inlineEdit ||
    prev.editable !== next.editable ||
    prev.selectionAnchorName !== next.selectionAnchorName
  ) {
    return false;
  }
  const affects = (
    orders: (index: SubtreeIndex) => ReadonlyMap<string, ReadonlyArray<number>>,
    prevKey: string | null | undefined,
    nextKey: string | null | undefined,
  ): boolean =>
    prevKey !== nextKey &&
    (subtreeContains(prev.index, prev.node, orders(prev.index), prevKey) ||
      subtreeContains(next.index, next.node, orders(next.index), nextKey));
  const ids = (index: SubtreeIndex) => index.idOrders;
  const paths = (index: SubtreeIndex) => index.pathOrders;
  const pathKey = (path: ReadonlyArray<PathStep> | null | undefined) =>
    path == null ? null : pathToString(path);
  return !(
    affects(paths, pathKey(prev.selectedPath), pathKey(next.selectedPath)) ||
    affects(ids, prev.hoveredId, next.hoveredId) ||
    affects(ids, prev.linkNodeId, next.linkNodeId) ||
    affects(ids, prev.typeErrorNodeId, next.typeErrorNodeId) ||
    (prev.typeErrorMessage !== next.typeErrorMessage &&
      subtreeContains(
        next.index,
        next.node,
        next.index.idOrders,
        next.typeErrorNodeId,
      ))
  );
}

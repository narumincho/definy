import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { estimateTextWidth } from "./engine.ts";
import {
  isSamePath,
  pathToString,
  type LayoutNode,
  type NodeKind,
  type PathStep,
} from "./types.ts";

type TreeLayoutRendererProps = {
  readonly node: LayoutNode;
  readonly selectedPath?: ReadonlyArray<PathStep> | null;
  readonly hoveredId?: string | null;
  readonly collapsedIds?: ReadonlySet<string>;
  readonly inlineEdit?: boolean;
  readonly editable?: boolean;
  readonly onSelectNode?: (id: string, path: ReadonlyArray<PathStep>) => void;
  /**
   * Ctrl / Cmd + クリックした名前 (子の無いノード) の定義へ移動する.
   * 移動できたら `true` を返し, 移動先が無ければ `false` を返す (そのときは普通に選ぶ)
   */
  readonly onGoToDefinition?: (path: ReadonlyArray<PathStep>) => boolean;
  /** Ctrl / Cmd を押しながらホバーしている, 定義へ移動できる名前のノードの ID. 下線を引く */
  readonly linkNodeId?: string | null;
  readonly onToggleCollapse?: (id: string) => void;
  readonly onChangeNumber?: (
    path: ReadonlyArray<PathStep>,
    value: number,
  ) => void;
  readonly onChangeString?: (
    path: ReadonlyArray<PathStep>,
    value: string,
  ) => void;
  readonly onClear?: (path: ReadonlyArray<PathStep>) => void;
  /** 選択中のノードに付ける CSS の anchor-name (`--` で始まる) */
  readonly selectionAnchorName?: string;
  /** 型エラーのあるノード (式 1 つ分のノード) の ID. そのノードに警告を出す */
  readonly typeErrorNodeId?: string | null;
  /** 型エラーの理由. `typeErrorNodeId` のノードの横に出す */
  readonly typeErrorMessage?: string;
};

/** 型エラーのあるノードの横に出す警告 */
function TypeErrorMarker({
  message,
}: {
  readonly message: string;
}): JSX.Element {
  return (
    <span className="tree-type-error" role="alert" title={message}>
      <span className="tree-type-error-icon" aria-hidden="true">
        ⚠
      </span>
      <span className="tree-type-error-message">{message}</span>
    </span>
  );
}

function nodeBadgeColors(kind: NodeKind): {
  readonly bg: string;
  readonly color: string;
  readonly border: string;
} {
  switch (kind) {
    case "literalNumber":
      return {
        bg: "var(--blue-bg-strong)",
        color: "var(--blue-text)",
        border: "1px solid var(--blue-border)",
      };
    case "literalString":
      return {
        bg: "var(--green-bg-strong)",
        color: "var(--green)",
        border: "1px solid var(--green-border)",
      };
    case "literalBoolean":
      return {
        bg: "var(--pink-bg-strong)",
        color: "var(--pink)",
        border: "1px solid var(--pink-border)",
      };
    case "identifier":
    case "parameterName":
      return {
        bg: "var(--overlay-3)",
        color: "var(--text)",
        border: "1px solid var(--overlay-3)",
      };
    case "keyword":
      return {
        bg: "var(--purple-bg-strong)",
        color: "var(--purple)",
        border: "1px solid var(--purple-border)",
      };
    case "symbol":
      return {
        bg: "var(--yellow-bg-strong)",
        color: "var(--yellow)",
        border: "1px solid var(--yellow-border)",
      };
    case "delimiter":
      return {
        bg: "transparent",
        color: "var(--text-secondary)",
        border: "none",
      };
    case "group":
      return {
        bg: "var(--blue-bg)",
        color: "var(--blue)",
        border: "1px solid var(--blue-border)",
      };
    case "block":
      return {
        bg: "var(--surface-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-strong)",
      };
    case "table":
      return {
        bg: "var(--purple-bg-strong)",
        color: "var(--purple-text)",
        border: "1px solid var(--purple-border)",
      };
  }
}

/**
 * 部分木に入っているノードの ID とパス (行きがけ順の番号で引く). 選択やホバーが変わったとき,
 * それを含まない部分木の描画を飛ばすのに使う (ID もパスも親子で入れ子になるとは限らないので番号で比べる)
 */
type SubtreeIndex = {
  /** ノード → 部分木の行きがけ順の番号の範囲 [start, end] */
  readonly ranges: WeakMap<LayoutNode, readonly [number, number]>;
  /** ID → その ID のノードの番号 */
  readonly idOrders: ReadonlyMap<string, ReadonlyArray<number>>;
  /** パス (`pathToString`) → そのパスのノードの番号 */
  readonly pathOrders: ReadonlyMap<string, ReadonlyArray<number>>;
};

function buildSubtreeIndex(root: LayoutNode): SubtreeIndex {
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

type TreeNodeProps = TreeLayoutRendererProps & {
  readonly collapsedIds: ReadonlySet<string>;
  readonly index: SubtreeIndex;
};

/** 部分木の描画が前と変わらないか. 関数の props は TreeLayoutRenderer が変わらないものにしている */
function sameTreeNodeProps(prev: TreeNodeProps, next: TreeNodeProps): boolean {
  if (
    prev.node !== next.node ||
    prev.collapsedIds !== next.collapsedIds ||
    prev.inlineEdit !== next.inlineEdit ||
    prev.editable !== next.editable ||
    prev.selectionAnchorName !== next.selectionAnchorName
  ) {
    return false;
  }
  // 前か後の値のノードがこの部分木にあれば描画し直す
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

const EMPTY_COLLAPSED_IDS: ReadonlySet<string> = new Set();

/**
 * 式のツリーを描く. 大きなパーツ (core の数千ノード) でも 1 回の変更で全部を描き直さないよう,
 * 変わっていない部分木 (同じノードのオブジェクトで, 選択などがその中で変わっていない) は描画を飛ばす (#762).
 * 変わっていない部分木を同じオブジェクトにするのは `reuseUnchangedNodes` (engine.ts)
 */
export function TreeLayoutRenderer(
  props: TreeLayoutRendererProps,
): JSX.Element {
  // 関数の props は毎回作られることが多いので, 最新のものを呼ぶ変わらない関数にして memo を効かせる
  const latest = useRef(props);
  latest.current = props;
  const callbacks = useMemo(
    () => ({
      onSelectNode: (id: string, path: ReadonlyArray<PathStep>) => {
        latest.current.onSelectNode?.(id, path);
      },
      onGoToDefinition: (path: ReadonlyArray<PathStep>) =>
        latest.current.onGoToDefinition?.(path) ?? false,
      onToggleCollapse: (id: string) => {
        latest.current.onToggleCollapse?.(id);
      },
      onChangeNumber: (path: ReadonlyArray<PathStep>, value: number) => {
        latest.current.onChangeNumber?.(path, value);
      },
      onChangeString: (path: ReadonlyArray<PathStep>, value: string) => {
        latest.current.onChangeString?.(path, value);
      },
      onClear: (path: ReadonlyArray<PathStep>) => {
        latest.current.onClear?.(path);
      },
    }),
    [],
  );
  const index = useMemo(() => buildSubtreeIndex(props.node), [props.node]);
  return (
    <TreeNode
      {...props}
      {...callbacks}
      collapsedIds={props.collapsedIds ?? EMPTY_COLLAPSED_IDS}
      index={index}
    />
  );
}

const TreeNode = memo(TreeNodeView, sameTreeNodeProps);

function TreeNodeView(props: TreeNodeProps): JSX.Element {
  const {
    node,
    selectedPath,
    hoveredId,
    collapsedIds,
    inlineEdit = true,
    editable = false,
    onSelectNode,
    onGoToDefinition,
    linkNodeId,
    onToggleCollapse,
    onChangeNumber,
    onChangeString,
    onClear,
    selectionAnchorName,
    typeErrorNodeId,
    typeErrorMessage = "",
  } = props;

  const isSelected = selectedPath ? isSamePath(selectedPath, node.path) : false;
  const isHovered = hoveredId === node.id;
  const isCollapsed = collapsedIds.has(node.id);

  const state = isSelected ? "selected" : isHovered ? "hovered" : "";
  const hasTypeError = typeErrorNodeId != null && typeErrorNodeId === node.id;
  const typeErrorMarker = hasTypeError ? (
    <TypeErrorMarker message={typeErrorMessage} />
  ) : null;

  function handleSelect(e: React.MouseEvent): void {
    e.stopPropagation();
    if (
      (e.ctrlKey || e.metaKey) &&
      node.children.length === 0 &&
      onGoToDefinition?.(node.path) === true
    ) {
      return;
    }
    onSelectNode?.(node.id, node.path);
  }

  /**
   * 選択中のノードだけに付ける CSS の anchor-name.
   * 置換メニュー (popover) をこのノードの直下に Anchor Positioning で配置するために使う
   */
  const anchorName = isSelected ? selectionAnchorName : undefined;

  // 1. Table node rendering (Spreadsheet view)
  if (node.kind === "table") {
    const headers = node.tableHeaders ?? [];
    const colWidths = node.columnsWidth ?? [];

    return (
      <div
        className="tree-node-table-wrapper tree-table"
        data-node-id={node.id}
        data-state={state}
        data-type-error={hasTypeError ? "true" : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-inset)",
          overflowX: "auto",
          maxWidth: "100%",
          margin: "0.35rem 0",
          boxShadow: "var(--shadow-sm)",
          ...(anchorName ? { anchorName } : {}),
        }}
        onClick={handleSelect}
      >
        {typeErrorMarker}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: "max-content",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "var(--overlay-2)",
              borderBottom: "1px solid var(--border)",
              padding: "0.4rem 0.6rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                width: "2.2rem",
                minWidth: "2.2rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              #
            </div>
            {headers.map((h, i) => (
              <div
                key={`th-${h}`}
                style={{
                  width: `${colWidths[i] ?? 80}px`,
                  minWidth: `${colWidths[i] ?? 80}px`,
                  padding: "0 0.5rem",
                  textAlign: "left",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {node.children.map((row, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid var(--overlay-2)",
                padding: "0.35rem 0.6rem",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  width: "2.2rem",
                  minWidth: "2.2rem",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  opacity: 0.6,
                }}
              >
                {rowIdx + 1}
              </div>
              {row.children.map((cell, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  style={{
                    width: `${colWidths[colIdx] ?? 80}px`,
                    minWidth: `${colWidths[colIdx] ?? 80}px`,
                    padding: "0 0.5rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <TreeNode {...props} node={cell} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Leaf node rendering (Literal / Identifier)
  if (node.children.length === 0) {
    return (
      <LeafNodeRenderer
        node={node}
        isSelected={isSelected}
        isHovered={isHovered}
        isLink={linkNodeId === node.id}
        state={state}
        inlineEdit={inlineEdit}
        editable={editable}
        onSelect={handleSelect}
        {...(anchorName !== undefined ? { anchorName } : {})}
        {...(onChangeNumber !== undefined ? { onChangeNumber } : {})}
        {...(onChangeString !== undefined ? { onChangeString } : {})}
        {...(onClear !== undefined ? { onClear } : {})}
        typeErrorMarker={typeErrorMarker}
      />
    );
  }

  // 3. Multiline capsule node rendering
  if (node.layoutMode === "multiline") {
    const colors = nodeBadgeColors(node.kind);
    // 見出しの無いノード (関数呼び出し) は最初の子 (呼び出す関数) を見出しの行に出す
    const [headerChild, bodyChildren] =
      node.label.length === 0
        ? [node.children[0], node.children.slice(1)]
        : [undefined, node.children];

    return (
      <div
        className="tree-node-capsule-multiline tree-capsule"
        data-state={state}
        data-node-id={node.id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.3rem",
          margin: "0.15rem 0",
          padding: "0.25rem 0.5rem 0.35rem 0.5rem",
          borderRadius: "var(--radius-lg)",
          // 長い行の文字列リテラルなど中身が枠より広いときも, 背景を中身の幅まで広げる (#800)
          width: "fit-content",
          minWidth: "max-content",
          boxSizing: "border-box",
        }}
        onClick={handleSelect}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            // 見出しのバッジが無いときは見出しの行の下にメニューを出す
            ...(anchorName && node.label.length === 0 ? { anchorName } : {}),
          }}
        >
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              padding: "0.05rem 0.2rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "0.72rem",
              lineHeight: 1,
              borderRadius: "var(--radius-full)",
            }}
            title={isCollapsed ? "詳細を展開" : "折りたたむ"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(node.id);
            }}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>

          {/* 複数行のときは子を含む全体ではなく, 見出しのバッジの直下にメニューを出す */}
          {node.label.length > 0 && (
            <div
              className="tree-badge"
              data-state={isSelected ? "selected" : ""}
              data-type-error={hasTypeError ? "true" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.12rem 0.42rem",
                borderRadius: "var(--radius-full)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.82rem",
                background: colors.bg,
                color: colors.color,
                border: colors.border,
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
                ...(anchorName ? { anchorName } : {}),
              }}
            >
              {node.label}
            </div>
          )}
          {headerChild !== undefined && (
            <TreeNode {...props} node={headerChild} />
          )}
          {typeErrorMarker}
        </div>

        {!isCollapsed && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
              paddingLeft: "0.8rem",
              borderLeft: "1px solid var(--border-strong)",
              marginLeft: "0.4rem",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {bodyChildren.map((child) => (
              <div key={child.id} style={{ width: "fit-content" }}>
                <TreeNode {...props} node={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. Inline capsule node rendering
  const colors = nodeBadgeColors(node.kind);
  return (
    <div
      className="tree-node-capsule-inline tree-capsule"
      data-state={state}
      data-node-id={node.id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.28rem",
        verticalAlign: "middle",
        margin: "0.08rem 0.12rem",
        padding: "0.1rem 0.3rem",
        borderRadius: "var(--radius-full)",
        whiteSpace: "nowrap",
        ...(anchorName ? { anchorName } : {}),
      }}
      onClick={handleSelect}
    >
      {/* 関数呼び出しなど見出しの無いノードはバッジを出さない */}
      {node.label.length > 0 && (
        <div
          className="tree-badge"
          data-state={isSelected ? "selected" : ""}
          data-type-error={hasTypeError ? "true" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.12rem 0.42rem",
            borderRadius: "var(--radius-full)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.82rem",
            background: colors.bg,
            color: colors.color,
            border: colors.border,
            cursor: "pointer",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {node.label}
        </div>
      )}
      {node.children.map((child) => (
        <TreeNode key={child.id} {...props} node={child} />
      ))}
      {typeErrorMarker}
    </div>
  );
}

/** 編集中の文字列リテラルの入力欄のカーソル位置. 入力欄が作り直されたときに戻すため */
let editingStringCaret: {
  readonly path: string;
  readonly start: number;
  readonly end: number;
} | null = null;

function LeafNodeRenderer({
  node,
  isSelected,
  isLink,
  state,
  anchorName,
  inlineEdit,
  editable,
  onSelect,
  onChangeNumber,
  onChangeString,
  onClear,
  typeErrorMarker,
}: {
  readonly node: LayoutNode;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  /** Ctrl / Cmd を押しながらホバーしていて, クリックで定義へ移動できる */
  readonly isLink: boolean;
  readonly state: string;
  readonly anchorName?: string;
  readonly inlineEdit: boolean;
  readonly editable: boolean;
  readonly onSelect: (e: React.MouseEvent) => void;
  readonly onChangeNumber?: (
    path: ReadonlyArray<PathStep>,
    value: number,
  ) => void;
  readonly onChangeString?: (
    path: ReadonlyArray<PathStep>,
    value: string,
  ) => void;
  readonly onClear?: (path: ReadonlyArray<PathStep>) => void;
  readonly typeErrorMarker: JSX.Element | null;
}): JSX.Element {
  const colors = nodeBadgeColors(node.kind);
  const isEditing = editable && isSelected && inlineEdit;

  const [localNumber, setLocalNumber] = useState(node.label);
  const [localString, setLocalString] = useState(() =>
    node.label.replace(/^"|"$/g, ""),
  );

  useEffect(() => {
    setLocalNumber(node.label);
    setLocalString(node.label.replace(/^"|"$/g, ""));
  }, [node.label]);

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    if (e.key === "Delete") {
      e.preventDefault();
      onClear?.(node.path);
      return;
    }
    if (e.key === "Backspace") {
      const val = e.currentTarget.value;
      let isAllSelected = false;
      try {
        isAllSelected =
          e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === val.length;
      } catch {
        // ignore
      }
      if (val.length === 0 || isAllSelected || val === node.label) {
        e.preventDefault();
        onClear?.(node.path);
        return;
      }
    }
    // Escape / Enter はツリーの枠 (ExpressionTreeEditor) で受けてツリーにフォーカスを戻す
  }

  function rememberCaret(textarea: HTMLTextAreaElement): void {
    editingStringCaret = {
      path: pathToString(node.path),
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  let content: JSX.Element;

  if (isEditing && node.kind === "literalNumber") {
    content = (
      <input
        type="number"
        value={localNumber}
        // クリック・Enter で選んだときはすぐ入力できるようにする.
        // キーボードで移動している間は inlineEdit が false なので入力欄にならない
        autoFocus
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "var(--radius-full)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          width: "3.5rem",
          textAlign: "center",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setLocalNumber(e.target.value);
          const num = Number(e.target.value);
          if (!Number.isNaN(num)) {
            onChangeNumber?.(node.path, num);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else if (isEditing && node.kind === "literalString") {
    // 文字列リテラルは改行を含められる. Shift + Enter で改行し, Enter でツリーに戻る (useTreeKeyboard)
    const lines = localString.split("\n");
    content = (
      <textarea
        value={localString}
        autoFocus
        rows={lines.length}
        cols={Math.max(6, ...lines.map((line) => estimateTextWidth(line, 1)))}
        onFocus={(e) => {
          // 改行の入力などで 1 行 ⇔ 複数行のレイアウトが変わると入力欄が作り直されるので, カーソルの位置を戻す
          const caret = editingStringCaret;
          if (caret !== null && caret.path === pathToString(node.path)) {
            e.currentTarget.setSelectionRange(caret.start, caret.end);
          } else {
            e.currentTarget.select();
          }
        }}
        onSelect={(e) => {
          rememberCaret(e.currentTarget);
        }}
        onBlur={() => {
          editingStringCaret = null;
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          resize: "none",
          overflow: "hidden",
          width: "auto",
          minHeight: 0,
          whiteSpace: "pre",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          rememberCaret(e.currentTarget);
          setLocalString(e.target.value);
          onChangeString?.(node.path, e.target.value);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else if (isEditing && node.kind === "parameterName") {
    content = (
      <input
        type="text"
        value={localString}
        autoFocus
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "var(--radius-full)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          minWidth: "3.5rem",
          maxWidth: "12rem",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setLocalString(e.target.value);
          onChangeString?.(node.path, e.target.value);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else {
    content = (
      <>
        <span>{node.label}</span>
        {node.hint !== undefined && (
          <span className="tree-hole-hint">{node.hint}</span>
        )}
      </>
    );
  }
  // 改行を含む文字列リテラルは改行したまま複数行で出す
  const isMultiline =
    node.kind === "literalString" && node.label.includes("\n");

  return (
    <div
      className="tree-node-leaf"
      data-node-id={node.id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        margin: "0.08rem 0.12rem",
        ...(anchorName ? { anchorName } : {}),
      }}
      onClick={onSelect}
    >
      <div
        className="tree-badge"
        data-state={state}
        data-type-error={typeErrorMarker !== null ? "true" : undefined}
        data-link={isLink ? "true" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.12rem 0.42rem",
          borderRadius: "var(--radius-full)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.82rem",
          background: colors.bg,
          color: colors.color,
          border: colors.border,
          cursor: "pointer",
          userSelect: "none",
          // 文字列リテラルは空白・改行をそのまま見せる
          whiteSpace: node.kind === "literalString" ? "pre" : "nowrap",
          ...(isMultiline
            ? { borderRadius: "var(--radius-md)", lineHeight: 1.5 }
            : {}),
          ...(isLink
            ? { textDecoration: "underline", textUnderlineOffset: "0.15em" }
            : {}),
        }}
      >
        {content}
      </div>
      {typeErrorMarker}
    </div>
  );
}

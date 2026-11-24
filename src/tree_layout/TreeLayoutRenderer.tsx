import { memo, useMemo, useRef, type JSX } from "react";
import { nodeBadgeStyle } from "./node_badge_style.ts";
import {
  buildSubtreeIndex,
  sameSubtreeProps,
  type SubtreeIndex,
} from "./subtree_index.ts";
import { TreeLeafNode } from "./TreeLeafNode.tsx";
import { TreeTableNode } from "./TreeTableNode.tsx";
import { isSamePath, type LayoutNode, type PathStep } from "./types.ts";

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

type TreeNodeProps = TreeLayoutRendererProps & {
  readonly collapsedIds: ReadonlySet<string>;
  readonly index: SubtreeIndex;
};

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

const TreeNode = memo(TreeNodeView, sameSubtreeProps);

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

  // 1. 表 (スプレッドシート)
  if (node.kind === "table") {
    return (
      <TreeTableNode
        node={node}
        state={state}
        hasTypeError={hasTypeError}
        anchorName={anchorName}
        typeErrorMarker={typeErrorMarker}
        onSelect={handleSelect}
        renderNode={(cell) => <TreeNode {...props} node={cell} />}
      />
    );
  }

  // 2. 子の無いノード (リテラル・名前)
  if (node.children.length === 0) {
    return (
      <TreeLeafNode
        node={node}
        isSelected={isSelected}
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

  // 3. 複数行のカプセル
  if (node.layoutMode === "multiline") {
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
                ...nodeBadgeStyle(node.kind),
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

  // 4. 1 行のカプセル
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
          style={nodeBadgeStyle(node.kind)}
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

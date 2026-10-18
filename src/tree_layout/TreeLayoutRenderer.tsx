import { useState, type JSX, type KeyboardEvent } from "react";
import {
  isSamePath,
  type LayoutNode,
  type NodeKind,
  type PathStep,
} from "./types.ts";

export interface TreeLayoutRendererProps {
  readonly node: LayoutNode;
  readonly selectedPath?: ReadonlyArray<PathStep> | null;
  readonly hoveredId?: string | null;
  readonly collapsedIds?: ReadonlySet<string>;
  readonly inlineEdit?: boolean;
  readonly editable?: boolean;
  readonly onSelectNode?: (id: string, path: ReadonlyArray<PathStep>) => void;
  readonly onHoverNode?: (id: string | null) => void;
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
  readonly selectionAnchorId?: string;
}

export function nodeBadgeColors(kind: NodeKind): {
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
    case "operator":
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

export function TreeLayoutRenderer(
  props: TreeLayoutRendererProps,
): JSX.Element {
  const {
    node,
    selectedPath,
    hoveredId,
    collapsedIds = new Set<string>(),
    inlineEdit = true,
    editable = false,
    onSelectNode,
    onHoverNode,
    onToggleCollapse,
    onChangeNumber,
    onChangeString,
    onClear,
    selectionAnchorId,
  } = props;

  const isSelected = selectedPath ? isSamePath(selectedPath, node.path) : false;
  const isHovered = hoveredId === node.id;
  const isCollapsed = collapsedIds.has(node.id);

  const state = isSelected ? "selected" : isHovered ? "hovered" : "";

  function handleSelect(e: React.MouseEvent): void {
    e.stopPropagation();
    onSelectNode?.(node.id, node.path);
  }

  function handleMouseEnter(e: React.MouseEvent): void {
    e.stopPropagation();
    onHoverNode?.(node.id);
  }

  function handleMouseLeave(): void {
    onHoverNode?.(null);
  }

  const anchorName = selectionAnchorId
    ? `--tree-node-${selectionAnchorId}-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : undefined;

  // 1. Table node rendering (Spreadsheet view)
  if (node.kind === "table") {
    const headers = node.tableHeaders ?? [];
    const colWidths = node.columnsWidth ?? [];

    return (
      <div
        className="tree-node-table-wrapper tree-table"
        data-node-id={node.id}
        data-state={state}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
                  <TreeLayoutRenderer {...props} node={cell} />
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
        state={state}
        anchorName={anchorName}
        inlineEdit={inlineEdit}
        editable={editable}
        onSelect={handleSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onChangeNumber={onChangeNumber}
        onChangeString={onChangeString}
        onClear={onClear}
      />
    );
  }

  // 3. Multiline capsule node rendering
  if (node.layoutMode === "multiline") {
    const colors = nodeBadgeColors(node.kind);

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
          width: "fit-content",
          maxWidth: "100%",
          boxSizing: "border-box",
          ...(anchorName ? { anchorName } : {}),
        }}
        onClick={handleSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
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

          <div
            className="tree-badge"
            data-state={isSelected ? "selected" : ""}
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

          {isCollapsed && (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                opacity: 0.75,
                fontFamily: "monospace",
                fontStyle: "italic",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.(node.id);
              }}
            >
              {`... (${node.children.length} args)`}
            </span>
          )}
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
            {node.children.map((child) => (
              <div
                key={child.id}
                style={{ width: "fit-content", maxWidth: "100%" }}
              >
                <TreeLayoutRenderer {...props} node={child} />
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="tree-badge"
        data-state={isSelected ? "selected" : ""}
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
      {node.children.map((child) => (
        <TreeLayoutRenderer key={child.id} {...props} node={child} />
      ))}
    </div>
  );
}

function LeafNodeRenderer({
  node,
  isSelected,
  state,
  anchorName,
  inlineEdit,
  editable,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  onChangeNumber,
  onChangeString,
  onClear,
}: {
  readonly node: LayoutNode;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly state: string;
  readonly anchorName?: string;
  readonly inlineEdit: boolean;
  readonly editable: boolean;
  readonly onSelect: (e: React.MouseEvent) => void;
  readonly onMouseEnter: (e: React.MouseEvent) => void;
  readonly onMouseLeave: () => void;
  readonly onChangeNumber?: (
    path: ReadonlyArray<PathStep>,
    value: number,
  ) => void;
  readonly onChangeString?: (
    path: ReadonlyArray<PathStep>,
    value: string,
  ) => void;
  readonly onClear?: (path: ReadonlyArray<PathStep>) => void;
}): JSX.Element {
  const colors = nodeBadgeColors(node.kind);
  const isEditing = editable && isSelected && inlineEdit;

  const [localNumber, setLocalNumber] = useState(node.label);
  const [localString, setLocalString] = useState(() =>
    node.label.replace(/^"|"$/g, ""),
  );

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      e.currentTarget.value.length === 0
    ) {
      e.preventDefault();
      onClear?.(node.path);
    }
  }

  let content: JSX.Element;

  if (isEditing && node.kind === "literalNumber") {
    content = (
      <input
        type="number"
        value={localNumber}
        autoFocus
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
    content = (
      <input
        type="text"
        value={localString}
        autoFocus
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
    content = <span>{node.label}</span>;
  }

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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="tree-badge"
        data-state={state}
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
        {content}
      </div>
    </div>
  );
}

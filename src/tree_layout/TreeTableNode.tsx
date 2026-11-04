import type { CSSProperties, JSX, MouseEvent, ReactNode } from "react";
import type { LayoutNode } from "./types.ts";

/** 表 (スプレッドシート) で出すノード. 行が子, セルが孫. セルの中身は `renderNode` で描く */
export function TreeTableNode({
  node,
  state,
  hasTypeError,
  anchorName,
  typeErrorMarker,
  onSelect,
  renderNode,
}: {
  readonly node: LayoutNode;
  readonly state: string;
  readonly hasTypeError: boolean;
  readonly anchorName: string | undefined;
  readonly typeErrorMarker: JSX.Element | null;
  readonly onSelect: (e: MouseEvent) => void;
  readonly renderNode: (cell: LayoutNode) => ReactNode;
}): JSX.Element {
  const headers = node.tableHeaders ?? [];
  const colWidths = node.columnsWidth ?? [];
  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-inset)",
    overflowX: "auto",
    maxWidth: "100%",
    margin: "0.35rem 0",
    boxShadow: "var(--shadow-sm)",
    ...(anchorName ? { anchorName } : {}),
  };
  return (
    <div
      className="tree-node-table-wrapper tree-table"
      data-node-id={node.id}
      data-state={state}
      data-type-error={hasTypeError ? "true" : undefined}
      style={wrapperStyle}
      onClick={onSelect}
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
                {renderNode(cell)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";
import type { NodeKind } from "./types.ts";

/** 式のツリーのノードの種類ごとのバッジの色 */
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

/** ノードの見出しのバッジ (`.tree-badge`) の共通のスタイル */
export function nodeBadgeStyle(kind: NodeKind): CSSProperties {
  const colors = nodeBadgeColors(kind);
  return {
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
  };
}

import { useLayoutEffect, useState, type JSX, type RefObject } from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";

export type ExpressionHoverCardProps = {
  readonly language: LanguageCode;
  /** ツリーの枠. カードはこの中に絶対配置する */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** カードを出す式のノードの ID (`data-node-id`) */
  readonly nodeId: string;
  /** パーツ名 (`module.name`) や変数名 */
  readonly title: string | null;
  readonly titleKind: "part" | "variable" | null;
  /**
   * 式の型. `loading` は型チェッカーに聞いている途中, `null` は分からない (型のツリーエディタなど)
   */
  readonly type:
    | { readonly kind: "inferred" | "expected"; readonly text: string }
    | "loading"
    | null;
  /** パーツの説明 */
  readonly description: string;
};

/**
 * 式をホバーしたときに, その式の型とパーツのドキュメントを式の下に出すカード.
 * マウスの邪魔をしないよう `pointer-events: none` にしている
 */
export function ExpressionHoverCard({
  language,
  containerRef,
  nodeId,
  title,
  titleKind,
  type,
  description,
}: ExpressionHoverCardProps): JSX.Element | null {
  const [position, setPosition] = useState<{
    readonly top: number;
    readonly left: number;
  } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const element = container?.querySelector(
      `[data-node-id="${CSS.escape(nodeId)}"]`,
    );
    if (!container || !element) {
      setPosition(null);
      return;
    }
    // 複数行の式は子を含む全体ではなく見出しのバッジの下に出す
    const anchor = element.querySelector(".tree-badge") ?? element;
    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    setPosition({
      top: anchorRect.bottom - containerRect.top + container.scrollTop + 4,
      left: Math.max(
        0,
        anchorRect.left - containerRect.left + container.scrollLeft,
      ),
    });
  }, [containerRef, nodeId]);

  if (position === null) {
    return null;
  }
  return (
    <div
      className="tree-hover-card"
      role="tooltip"
      style={{ top: position.top, left: position.left }}
    >
      {title !== null && (
        <div className="tree-hover-card-title">
          <span className="tree-hover-card-kind">
            {titleKind === "part"
              ? label(language, "part", "パーツ", "parto")
              : label(language, "variable", "変数", "variablo")}
          </span>
          <span>{title}</span>
        </div>
      )}
      {type !== null && (
        <div className="tree-hover-card-type">
          <span className="tree-hover-card-kind">
            {type !== "loading" && type.kind === "expected"
              ? label(language, "expected type", "期待する型", "atendata tipo")
              : label(language, "type", "型", "tipo")}
          </span>
          <code>{type === "loading" ? "…" : type.text}</code>
        </div>
      )}
      {description.length > 0 && (
        <p className="tree-hover-card-description">{description}</p>
      )}
    </div>
  );
}

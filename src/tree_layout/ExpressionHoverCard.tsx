import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";
import { TypeTreeView } from "./TypeTreeView.tsx";
import { hoverCardPosition } from "./hover_info.ts";

export type ExpressionHoverCardProps = {
  readonly language: LanguageCode;
  /** ツリーの枠. カードを出す式のノードをこの中から探す */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** カードを出す式のノードの ID (`data-node-id`) */
  readonly nodeId: string;
  /** パーツ名 (`module.name`) や変数名 */
  readonly title: string | null;
  readonly titleKind: "part" | "variable" | null;
  /**
   * 式の型 (`core.type-ast` の値). `loading` は型チェッカーに聞いている途中, `null` は分からない (型のツリーエディタなど)
   */
  readonly type:
    | { readonly kind: "inferred" | "expected"; readonly type: unknown }
    | "loading"
    | null;
  /** パーツの説明 */
  readonly description: string;
};

/**
 * 式をホバーしたときに, その式の型とパーツのドキュメントを式の下に出すカード.
 * ツリーの枠 (`overflow: auto`) で切れたり枠の中にスクロールバーが出たりしないよう,
 * body に出した popover (top layer) の `position: fixed` にして画面の座標で置く.
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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{
    readonly top: number;
    readonly left: number;
  } | null>(null);
  const [anchorFound, setAnchorFound] = useState(true);

  const updatePosition = useCallback(() => {
    const element = containerRef.current?.querySelector(
      `[data-node-id="${CSS.escape(nodeId)}"]`,
    );
    const card = cardRef.current;
    if (!element || !card) {
      setAnchorFound(false);
      return;
    }
    setAnchorFound(true);
    // 複数行の式は子を含む全体ではなく見出しのバッジの下に出す
    const anchor = element.querySelector(".tree-badge") ?? element;
    const anchorRect = anchor.getBoundingClientRect();
    const next = hoverCardPosition(
      anchorRect,
      { width: card.offsetWidth, height: card.offsetHeight },
      {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
    );
    // 毎回の描画で測り直すので, 位置が変わらなければ状態を変えない (描画が止まらなくなるため)
    setPosition((prev) =>
      prev !== null && prev.top === next.top && prev.left === next.left
        ? prev
        : next,
    );
  }, [containerRef, nodeId]);

  // 中身 (型を聞き終わったときなど) が変わるとカードの大きさが変わるので, 毎回測り直す
  useLayoutEffect(() => {
    updatePosition();
  });

  useLayoutEffect(() => {
    // スクロールしたら式の位置が動くので追いかける
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  if (!anchorFound) {
    return null;
  }
  // ツリーの枠の外 (body) に出す. 枠の中のノードを探すセレクター (`.tree-badge` など) にカードの型のツリーが混ざらないようにするため
  return createPortal(
    <div
      ref={(element) => {
        cardRef.current = element;
        // top layer に出して, 祖先の overflow や z-index に影響されないようにする
        if (
          element !== null &&
          typeof element.showPopover === "function" &&
          !element.matches(":popover-open")
        ) {
          element.showPopover();
        }
      }}
      popover="manual"
      className="tree-hover-card"
      role="tooltip"
      style={
        position === null
          ? { top: 0, left: 0, visibility: "hidden" }
          : { top: position.top, left: position.left }
      }
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
          {type === "loading" ? (
            <code>…</code>
          ) : (
            <TypeTreeView type={type.type} />
          )}
        </div>
      )}
      {description.length > 0 && (
        <p className="tree-hover-card-description">{description}</p>
      )}
    </div>,
    document.body,
  );
}

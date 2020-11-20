import styled, { StyledComponent } from "styled-components";
import { ReactElement } from "react";

type SimpleStyle = {
  /** 方向 x → 横方向, y → 縦方向 */
  direction: "x" | "y";
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** 間の余白 */
  gap?: number;
  /** 余白 */
  padding: number;
};

/** CSSの指定をできるだけしなくて済むように */
export const styledDiv = (
  simpleStyle: SimpleStyle
): StyledComponent<
  "div",
  Record<string, unknown>,
  Record<never, never>,
  never
> =>
  styled.div({
    display: "grid",
    boxSizing: "border-box",
    wordBreak: "break-all",
    breakWord: "break-word",
    gridAutoFlow: simpleStyle.direction === "x" ? "column" : "row",
    width: simpleStyle.width,
    height: simpleStyle.height,
    gap: simpleStyle.gap,
    padding: simpleStyle.padding,
    backgroundColor: "#111",
    color: "#ddd",
  });

export type Editor<T> = (props: {
  value: T;
  onChange: (newValue: T) => void;
  name: string;
}) => ReactElement;

import { SerializedStyles, css, jsx as h } from "@emotion/react";
import { Model } from "./model";
import { ReactElement } from "react";

export type GridTemplateValue = { _: "Fix"; value: number } | { _: "OneFr" };

export type SimpleStyle = {
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
  /** 丸角 デフォルト 0 */
  borderRadius?: number;
  /** ボーダー */
  border?: { width: number; color: string };
  /** 横方向の区切り方 */
  xGridTemplate?: ReadonlyArray<GridTemplateValue>;
};

/** CSSの指定をできるだけしなくて済むように */
export const simpleStyleToCss = (simpleStyle: SimpleStyle): SerializedStyles =>
  css({
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
    borderRadius: simpleStyle.borderRadius,
    border:
      simpleStyle.border === undefined
        ? "none"
        : "solid " +
          simpleStyle.border.width.toString() +
          "px " +
          simpleStyle.border.color,
    gridTemplateColumns:
      simpleStyle.xGridTemplate === undefined
        ? undefined
        : simpleStyle.xGridTemplate.map(gridTemplateToCssString).join(" "),
  });

const gridTemplateToCssString = (value: GridTemplateValue): string => {
  switch (value._) {
    case "Fix":
      return value.value.toString() + "px";
    case "OneFr":
      return "1fr";
  }
};

export type EditorProps<T> = {
  readonly value: T;
  readonly onChange: (newValue: T) => void;
  readonly name: string;
  readonly model: Model;
};

export type Editor<T> = (props: EditorProps<T>) => ReactElement;

export const editorToReactElement = <T>(
  editor: Editor<T>,
  props: {
    value: T;
    onChange: (newValue: T) => void;
    name: string;
    key?: string;
    model: Model;
  }
): ReactElement => h(editor, props);

export type Theme = "Gray" | "Black" | "Active";

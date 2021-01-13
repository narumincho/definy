import { c, div, path, svg } from "./view/viewUtil";
import { Element } from "./view/view";

export type GridTemplateValue = { _: "Fix"; value: number } | { _: "OneFr" };

export interface BoxOption<Message> {
  /** 方向 x → 横方向, y → 縦方向 */
  direction: "x" | "y";
  /** 幅. undefined で 100% */
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
  /** 縦方向にスクロールするか */
  isScrollY?: boolean;
  /** クリックのイベント */
  click?: { stopPropagation: boolean; message: Message };
}

/** CSSの指定をできるだけしなくて済むように */
export const box = <Message>(
  option: BoxOption<Message>,
  children: ReadonlyMap<string, Element<Message>>
): Element<Message> =>
  div(
    {
      style: {
        display: "grid",
        boxSizing: "border-box",
        wordBreak: "break-all",
        breakWord: "break-word",
        gridAutoFlow: option.direction === "x" ? "column" : "row",
        width: option.width === undefined ? "100%" : option.width,
        height: option.height,
        gap: option.gap,
        padding: option.padding,
        backgroundColor: "#111",
        color: "#ddd",
        borderRadius: option.borderRadius,
        border:
          option.border === undefined
            ? "none"
            : "solid " +
              option.border.width.toString() +
              "px " +
              option.border.color,
        gridTemplateColumns:
          option.xGridTemplate === undefined
            ? undefined
            : option.xGridTemplate.map(gridTemplateToCssString).join(" "),
        alignContent: "start",
        overflowY: option.isScrollY === true ? "scroll" : "visible",
      },
      click: option.click,
    },
    children
  );

const gridTemplateToCssString = (value: GridTemplateValue): string => {
  switch (value._) {
    case "Fix":
      return value.value.toString() + "px";
    case "OneFr":
      return "1fr";
  }
};

export const text = <Message>(string: string): Element<Message> =>
  div({}, string);

export type Theme = "Gray" | "Black" | "Active";

/**
 * GitHubのアイコン
 */
export const gitHubIcon = (option: {
  color: string;
  width: number;
  height: number;
  padding?: number;
  backgroundColor?: string;
  borderRadius?: number;
}): Element<never> =>
  svg(
    {
      viewBox: { x: 0, y: 0, width: 20, height: 20 },
      style: {
        width: option.width,
        height: option.height,
        padding: option.padding,
        backgroundColor: option.backgroundColor,
        borderRadius: option.borderRadius,
      },
    },
    c([
      [
        "",
        path({
          d:
            "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10",
          fill: option.color,
        }),
      ],
    ])
  );

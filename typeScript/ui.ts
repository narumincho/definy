import * as React from "react";
import { styled, Css, CssValue } from "react-free-style";
import * as common from "definy-common";
import { Maybe, UrlData } from "definy-common/source/data";

export type Panel =
  | { _: "Text"; attributes: TextAttributes; text: string }
  | {
      _: "Depth";
      attributes: DepthAttributes;
      children: ReadonlyArray<[[Alignment, Alignment], Panel]>;
    }
  | { _: "Row"; attributes: RowAttributes; children: ReadonlyArray<Panel> }
  | {
      _: "WrappedRow";
      attributes: WrappedAttributes;
      children: ReadonlyArray<Panel>;
    }
  | {
      _: "Column";
      attributes: ColumnAttributes;
      children: ReadonlyArray<Panel>;
    }
  | { _: "ScrollY"; attributes: ScrollAttributes; child: Panel }
  | { _: "Link"; attributes: LinkAttributes; child: Panel }
  | { _: "Button"; attributes: ButtonAttributes; child: Panel };

type TextAttributes = {
  key: string;
  width: Size;
  height: Size;
  /** テキストの揃え方. 指定なしで左揃え */
  alignment?: "end" | "center";
  justifySelf?: "start" | "center" | "end";
  alignSelf?: "start" | "center" | "end";
  fontSize?: number;
  color?: TextColor;
  backgroundColor?: BackgroundColor;
  padding?: number;
};

type TextColor = { _: "Custom"; code: string };

type DepthAttributes = {
  key: string;
  width: Size;
  height: Size;
  padding?: number;
  backgroundColor?: BackgroundColor;
};

type RowAttributes = {
  key: string;
  width: Size;
  height: Size;
  alignContent?: "start" | "center" | "end";
  justifyContent?: "start" | "center" | "end";
  alignSelf?: "start" | "center" | "end";
  justifySelf?: "start" | "center" | "end";
  gap?: number;
  backgroundColor?: BackgroundColor;
  padding?: number;
};

type WrappedAttributes = {
  key: string;
  width: Size;
  height: Size;
  oneLineCount: number;
  alignContent?: "start" | "center" | "end";
  justifyContent?: "start" | "center" | "end";
  alignSelf?: "start" | "center" | "end";
  justifySelf?: "start" | "center" | "end";
  backgroundColor?: BackgroundColor;
  padding?: number;
  gap?: number;
};

type ColumnAttributes = {
  key: string;
  width: Size;
  height: Size;
  alignContent?: "start" | "center" | "end";
  justifyContent?: "start" | "center" | "end";
  alignSelf?: "start" | "center" | "end";
  justifySelf?: "start" | "center" | "end";
  gap?: number;
  backgroundColor?: BackgroundColor;
  padding?: number;
};

type ScrollAttributes = {
  key: string;
  width: Size;
  height: Size;
  backgroundColor?: BackgroundColor;
  padding?: number;
};

type LinkAttributes = {
  key: string;
  width: Size;
  height: Size;
  alignSelf?: "start" | "center" | "end";
  justifySelf?: "start" | "center" | "end";
  backgroundColor?: BackgroundColor;
  urlData: UrlData;
  onJump: (urlData: UrlData) => void;
  padding?: number;
};

type ButtonAttributes = {
  key: string;
  width: Size;
  height: Size;
  onClick: () => void;
  backgroundColor?: BackgroundColor;
  padding?: number;
};

type Size =
  | { _: "Fix"; size: number }
  | { _: "Stretch" }
  | { _: "StretchWithMax"; max: number }
  | { _: "Auto" };

const sizeListToGridTemplate = (
  size: Size,
  childSizeList: ReadonlyArray<Size>
): string =>
  childSizeList
    .map((child) => sizeListToGridTemplateItem(child))
    .concat(
      childSizeList.some(isStretch)
        ? []
        : ((): ReadonlyArray<string> => {
            switch (size._) {
              case "Auto":
                return [];
              default:
                return ["1fr"];
            }
          })()
    )
    .join(" ");

const sizeListToGridTemplateItem = (size: Size): string => {
  switch (size._) {
    case "Fix":
      return size.size.toString() + "px";
    case "Stretch":
      return "1fr";
    case "StretchWithMax":
      return "min(1fr, " + size.max.toString() + "px )";
    case "Auto":
      return "auto";
  }
};

type Alignment = "Start" | "Center" | "End";

const alignmentToCssValue = (alignment: Alignment): string => {
  switch (alignment) {
    case "Start":
      return "start";
    case "Center":
      return "center";
    case "End":
      return "end";
  }
};

export const text = (attributes: TextAttributes, text: string): Panel => ({
  _: "Text",
  attributes,
  text,
});

/**
 * パネルを重ねる. あとのほうが手前に表示される
 */
export const depth = (
  attributes: DepthAttributes,
  children: ReadonlyArray<[[Alignment, Alignment], Panel]>
): Panel => ({ _: "Depth", attributes, children });

/**
 * パネルを横に並べる
 */
export const row = (
  attributes: RowAttributes,
  children: ReadonlyArray<Panel>
): Panel => ({ _: "Row", attributes, children });

/**
 * 要素を横に並べる. oneLineCountよりパネルの数が多い場合折り返す. それぞれの幅は均等になる
 */
export const wrappedRow = (
  attributes: WrappedAttributes,
  children: ReadonlyArray<Panel>
): Panel => ({ _: "WrappedRow", attributes, children });

/**
 * パネルを縦に並べる
 */
export const column = (
  attributes: ColumnAttributes,
  children: ReadonlyArray<Panel>
): Panel => ({ _: "Column", attributes, children });

/**
 * 中身のパネルが縦方向にスクロールするようにする
 */
export const scroll = (attributes: ScrollAttributes, child: Panel): Panel => ({
  _: "ScrollY",
  attributes,
  child,
});

/**
 * アプリ内リンク
 */
export const link = (attributes: LinkAttributes, child: Panel): Panel => ({
  _: "Link",
  attributes,
  child,
});

type GridCell = {
  /** 横方向 */
  row: number;
  /** 縦方向 */
  column: number;
};

const gridCellToStyle = (gridCell: GridCell): Css => ({
  gridRow:
    (gridCell.row + 1).toString() + " / " + (gridCell.row + 2).toString(),
  gridColumn:
    (gridCell.column + 1).toString() + " / " + (gridCell.column + 2).toString(),
});

const widthAndHeightToStyle = (width: Size, height: Size): Css => ({
  width: sizeToCssWidthOrHeight(width),
  maxWidth: width._ === "StretchWithMax" ? width.max : undefined,
  height: sizeToCssWidthOrHeight(height),
  maxHeight: height._ === "StretchWithMax" ? height.max : undefined,
});

const sizeToCssWidthOrHeight = (size: Size): string => {
  switch (size._) {
    case "Fix":
      return size.size.toString() + "px";
    case "Stretch":
    case "StretchWithMax":
      return "100%";
    case "Auto":
      return "auto";
  }
};

type AlignmentOrStretch =
  | { _: "Alignment"; alignment: [Alignment, Alignment] }
  | { _: "StretchRow" }
  | { _: "StretchColumn" }
  | { _: "StretchStretch" };

const isStretch = (size: Size) => {
  switch (size._) {
    case "Stretch":
      return true;
    default:
      return false;
  }
};

const alignmentOrStretchToCss = (
  width: Size,
  height: Size,
  alignmentOrStretch: AlignmentOrStretch
): Css => {
  switch (alignmentOrStretch._) {
    case "Alignment":
      return {
        justifySelf: isStretch(width)
          ? "stretch"
          : alignmentToCssValue(alignmentOrStretch.alignment[0]),
        alignSelf: isStretch(height)
          ? "stretch"
          : alignmentToCssValue(alignmentOrStretch.alignment[1]),
      };
    case "StretchRow":
      return {
        justifySelf: "stretch",
        alignSelf: "center",
      };
    case "StretchColumn":
      return {
        justifySelf: "center",
        alignSelf: "stretch",
      };
    case "StretchStretch":
      return {
        justifySelf: "stretch",
        alignSelf: "stretch",
      };
  }
};

const isIncludeScrollInPanel = (panel: Panel): boolean => {
  switch (panel._) {
    case "Text":
      return false;
    case "Depth":
      return panel.children.some(([_, panel]) => isIncludeScrollInPanel(panel));
    case "Row":
    case "WrappedRow":
    case "Column":
      return panel.children.some(isIncludeScrollInPanel);
    case "ScrollY":
    case "Link":
    case "Button":
      return isIncludeScrollInPanel(panel.child);
  }
};

export const toReactElement = (panel: Panel): React.ReactElement =>
  panelToReactElement({ row: 0, column: 0 }, { _: "StretchStretch" }, panel);

/**
 * パネルをReactElementに変換する
 */
export const panelToReactElement = (
  gridCell: GridCell,
  alignmentOrStretch: AlignmentOrStretch,
  panel: Panel
): React.ReactElement => {
  const commonStyle: Css = {
    ...gridCellToStyle(gridCell),
    ...alignmentOrStretchToCss(
      panel.attributes.width,
      panel.attributes.height,
      alignmentOrStretch
    ),
    ...widthAndHeightToStyle(panel.attributes.width, panel.attributes.height),
    overflowX: "hidden",
    overflowY: isIncludeScrollInPanel(panel) ? "auto" : "hidden",
    padding: panel.attributes.padding,
    backgroundColor:
      panel.attributes.backgroundColor === undefined
        ? undefined
        : backgroundColorToColor(panel.attributes.backgroundColor),
  };
  switch (panel._) {
    case "Text":
      return textToReactElement(commonStyle, panel.attributes, panel.text);
    case "Depth":
      return depthToReactElement(commonStyle, panel.attributes, panel.children);
    case "Row":
      return rowToReactElement(commonStyle, panel.attributes, panel.children);
    case "WrappedRow":
      return wrappedRowToReactElement(
        commonStyle,
        panel.attributes,
        panel.children
      );
    case "Column":
      return columnToReactElement(
        commonStyle,
        panel.attributes,
        panel.children
      );
    case "ScrollY":
      return scrollToReactElement(commonStyle, panel.attributes, panel.child);
    case "Link":
      return linkToReactElement(commonStyle, panel.attributes, panel.child);
    case "Button":
      return buttonToReactElement(commonStyle, panel.attributes, panel.child);
  }
};

const textToReactElement = (
  commonStyle: Css,
  attributes: TextAttributes,
  text: string
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> => {
  return React.createElement(
    styled("div", {
      ...commonStyle,
      justifySelf: attributes.justifySelf,
      fontSize: attributes.fontSize,
      color: attributes.color === undefined ? "#ddd" : attributes.color.code,
      backgroundColor:
        attributes.backgroundColor === undefined
          ? undefined
          : backgroundColorToColor(attributes.backgroundColor),
      overflowWrap: "break-word",
      fontFamily: "Hack",
      textAlign:
        attributes.alignment === undefined ? "start" : attributes.alignment,
    }),
    { key: attributes.key },
    text
  );
};

const depthToReactElement = (
  commonStyle: Css,
  attributes: DepthAttributes,
  children: ReadonlyArray<[[Alignment, Alignment], Panel]>
) =>
  React.createElement(
    styled("div", {
      ...commonStyle,
      display: "grid",
      gridTemplateColumns: "1fr",
      gridTemplateRows: "1fr",
    }),
    { key: attributes.key },
    children.map(([alignment, child]) =>
      panelToReactElement(
        { row: 0, column: 0 },
        { _: "Alignment", alignment },
        child
      )
    )
  );

const columnToReactElement = (
  commonStyle: Css,
  attributes: ColumnAttributes,
  children: ReadonlyArray<Panel>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...commonStyle,
      alignContent: attributes.alignContent,
      justifyContent: attributes.justifyContent,
      backgroundColor:
        attributes.backgroundColor === undefined
          ? undefined
          : backgroundColorToColor(attributes.backgroundColor),
      display: "grid",
      gridTemplateRows: sizeListToGridTemplate(
        attributes.height,
        children.map((child) => child.attributes.height)
      ),
      gridTemplateColumns: "1fr",
      gap: attributes.gap,
    }),
    { key: attributes.key },
    children.map((child, index) =>
      panelToReactElement(
        { row: index, column: 0 },
        { _: "StretchColumn" },
        child
      )
    )
  );

const rowToReactElement = (
  commonStyle: Css,
  attributes: RowAttributes,
  children: ReadonlyArray<Panel>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...commonStyle,
      alignContent: attributes.alignContent,
      justifyContent: attributes.justifyContent,
      backgroundColor:
        attributes.backgroundColor === undefined
          ? undefined
          : backgroundColorToColor(attributes.backgroundColor),
      display: "grid",
      gridTemplateRows: "1fr",
      gridTemplateColumns: sizeListToGridTemplate(
        attributes.width,
        children.map((child) => child.attributes.width)
      ),
      gap: attributes.gap,
    }),
    { key: attributes.key },
    children.map((child, index) =>
      panelToReactElement({ row: 0, column: index }, { _: "StretchRow" }, child)
    )
  );

const wrappedRowToReactElement = (
  commonStyle: Css,
  attributes: WrappedAttributes,
  children: ReadonlyArray<Panel>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...commonStyle,
      alignContent: attributes.alignContent,
      justifyContent: attributes.justifyContent,
      backgroundColor:
        attributes.backgroundColor === undefined
          ? undefined
          : backgroundColorToColor(attributes.backgroundColor),
      display: "grid",
      gridTemplateColumns: new Array(attributes.oneLineCount)
        .fill("1fr")
        .join(" "),
      gap: attributes.gap,
    }),
    { key: attributes.key },
    children.map((child, index) =>
      panelToReactElement(
        {
          row: Math.floor(index / attributes.oneLineCount),
          column: index % attributes.oneLineCount,
        },
        { _: "StretchRow" },
        child
      )
    )
  );

const scrollToReactElement = (
  commonStyle: Css,
  attributes: ScrollAttributes,
  child: Panel
): React.ReactElement =>
  React.createElement(
    styled("div", { ...commonStyle, overflowY: "scroll" }),
    { key: attributes.key },
    panelToReactElement({ row: 0, column: 0 }, { _: "StretchStretch" }, child)
  );

export const linkToReactElement = (
  commonStyle: Css,
  attributes: LinkAttributes,
  child: Panel
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLAnchorElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { css?: CssValue }
> => {
  return React.createElement(
    styled("a", {
      ...commonStyle,
      justifySelf: attributes.justifySelf,
      textDecoration: "none",
    }),
    {
      onClick: (event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          attributes.onJump(attributes.urlData);
        }
      },
      key: attributes.key,
      href: common
        .urlDataAndAccessTokenToUrl(attributes.urlData, Maybe.Nothing())
        .toString(),
    },
    panelToReactElement({ row: 0, column: 0 }, { _: "StretchStretch" }, child)
  );
};

const buttonToReactElement = (
  commonStyle: Css,
  attributes: ButtonAttributes,
  child: Panel
): React.ReactElement => {
  return React.createElement(
    styled("button", {
      ...commonStyle,
      cursor: "pointer",
    }),
    {
      onClick: attributes.onClick,
    },
    panelToReactElement({ row: 0, column: 0 }, { _: "StretchStretch" }, child)
  );
};

type BackgroundColor = "Black" | "Dark";

const backgroundColorToColor = (backgroundColor: BackgroundColor): string => {
  switch (backgroundColor) {
    case "Black":
      return "#000";
    case "Dark":
      return "#2f2f2f";
  }
};

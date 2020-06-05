import * as React from "react";
import { CssValue, styled } from "react-free-style";
import type * as cssType from "csstype";
import * as common from "definy-common";
import { Maybe, UrlData } from "definy-common/source/data";

export const text = (
  attributes: {
    key: string;
    width?: number;
    height?: number;
    justifySelf?: "start" | "end";
    fontSize?: number;
    color: string;
    backgroundColor?: BackgroundColor;
  },
  text: string
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      width: attributes.width,
      height: attributes.height,
      justifySelf:
        attributes.justifySelf === undefined
          ? "center"
          : attributes.justifySelf,
      fontSize: attributes.fontSize,
      color: attributes.color,
      backgroundColor:
        attributes.backgroundColor === undefined
          ? undefined
          : backgroundColorToColor(attributes.backgroundColor),
      overflow: "hidden",
      overflowWrap: "break-word",
      fontFamily: "Hack",
    }),
    { key: attributes.key },
    text
  );

export const column = (
  attributes: {
    width: number;
    height: number;
    alignContent?: "start" | "center" | "end";
    justifyContent?: "start" | "center" | "end";
    backgroundColor: BackgroundColor;
    key: string;
  },
  children: ReadonlyArray<
    [cssType.GridTemplateColumnsProperty<string | 0>, React.ReactNode]
  >
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...attributes,
      display: "grid",
      gridAutoFlow: "row",
      backgroundColor: backgroundColorToColor(attributes.backgroundColor),
      gridTemplateRows: children.map((child) => child[0]).join(" "),
      overflow: "hidden",
    }),
    { key: attributes.key },
    children.map((child) => child[1])
  );

export const row = (
  attributes: {
    width: number;
    height: number;
    alignContent?: "start" | "center" | "end";
    justifyContent?: "start" | "center" | "end";
    key: string;
  },
  children: ReadonlyArray<
    [cssType.GridTemplateColumnsProperty<string | 0>, React.ReactNode]
  >
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> => {
  return React.createElement(
    styled("div", {
      ...attributes,
      display: "grid",
      gridAutoFlow: "column",
      gridTemplateColumns: children.map((child) => child[0]).join(" "),
      overflow: "hidden",
    }),
    { key: attributes.key },
    children.map((child) => child[1])
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

export const link = (
  attributes: {
    urlData: UrlData;
    onJump: (urlData: UrlData) => void;
    key: string;
    justifySelf?: "start" | "end";
  },
  child: React.ReactNode
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLAnchorElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { css?: CssValue }
> => {
  return React.createElement(
    styled("a", {
      justifySelf:
        attributes.justifySelf === undefined
          ? "center"
          : attributes.justifySelf,
      textDecoration: "none",
      overflow: "hidden",
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
    child
  );
};

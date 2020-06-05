import * as React from "react";
import { CssValue, styled } from "react-free-style";

export const button = (
  cssValue: CssValue,
  attributes: React.ButtonHTMLAttributes<HTMLButtonElement>,
  children: ReadonlyArray<React.ReactNode> | string
): React.FunctionComponentElement<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> => {
  return React.createElement(styled("button", cssValue), attributes, children);
};

export const text = (
  attributes: {
    key: string;
    width?: number;
    height?: number;
    justifySelf: "start" | "center" | "end";
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
      justifySelf: attributes.justifySelf,
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
  style: {
    width: number;
    height: number;
    alignContent: "start" | "center" | "end" | "stretch";
    justifyContent: "start" | "center" | "end" | "stretch";
    backgroundColor: BackgroundColor;
  },
  children: ReadonlyArray<React.ReactNode>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...style,
      display: "grid",
      gridAutoFlow: "row",
      backgroundColor: backgroundColorToColor(style.backgroundColor),
    }),
    {},
    children
  );

export const row = (
  style: {
    width: number;
    height: number;
    alignContent: "start" | "center" | "end" | "stretch";
    justifyContent: "start" | "center" | "end" | "stretch";
  },
  children: ReadonlyArray<React.ReactNode>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", { ...style, display: "grid", gridAutoFlow: "column" }),
    {},
    children
  );

type BackgroundColor = "Black" | "Dark";

const backgroundColorToColor = (backgroundColor: BackgroundColor): string => {
  switch (backgroundColor) {
    case "Black":
      return "#000";
    case "Dark":
      return "#2f2f2f";
  }
};

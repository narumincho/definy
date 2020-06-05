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
  children: ReadonlyArray<React.ReactNode>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", {
      ...attributes,
      display: "grid",
      gridAutoFlow: "row",
      backgroundColor: backgroundColorToColor(attributes.backgroundColor),
    }),
    { key: attributes.key },
    children
  );

export const row = (
  attributes: {
    width: number;
    height: number;
    alignContent?: "start" | "center" | "end";
    justifyContent?: "start" | "center" | "end";
    key: string;
  },
  children: ReadonlyArray<React.ReactNode>
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>
> =>
  React.createElement(
    styled("div", { ...attributes, display: "grid", gridAutoFlow: "column" }),
    { key: attributes.key },
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

export type Location = "Home" | "Idea";

export const link = (
  attributes: {
    location: Location;
    onJump: (location: Location) => void;
    key: string;
  },
  child: React.ReactNode
): React.DetailedReactHTMLElement<
  {
    onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    href: string;
    key: string;
  },
  HTMLElement
> => {
  return React.createElement(
    "a",
    {
      onClick: (event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          attributes.onJump(attributes.location);
        }
      },
      key: attributes.key,
      href: locationToUrl(attributes.location),
    },
    child
  );
};

export const locationToUrl = (location: Location): string => {
  switch (location) {
    case "Home":
      return "http://localhost:2520/";
    case "Idea":
      return "http://localhost:2520/idea";
  }
};

export const locationFromPath = (path: string): Location => {
  if (path === "/") {
    return "Home";
  }
  return "Idea";
};

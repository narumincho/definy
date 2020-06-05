import * as React from "react";
import { CssValue, styled } from "react-free-style";

export const button = (
  cssValue: CssValue,
  attributes: React.ButtonHTMLAttributes<HTMLButtonElement>,
  children: ReadonlyArray<React.ReactNode> | string
): React.FunctionComponentElement<
  React.ClassAttributes<HTMLButtonElement> &
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      css?: CssValue;
    }
> => {
  const r = React.createElement(
    styled("button", cssValue),
    attributes,
    children
  );
  return r;
};

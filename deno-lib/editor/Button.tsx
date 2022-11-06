import React from "https://esm.sh/react@18.2.0";
import { jsx, CSSObject, css } from "https://esm.sh/@emotion/react@11.10.5";

export type Props = {
  readonly onClick: (() => void) | undefined;
  readonly style?: CSSObject;
  readonly children: React.ReactNode;
};

export const Button = (props: Props): React.ReactElement =>
  jsx("button", {
    css: css(
      {
        cursor: "pointer",
        border: "none",
        padding: 8,
        textAlign: "left",
        fontSize: 16,
        backgroundColor: "#333",
        color: "#ddd",
        "&:hover": {
          backgroundColor: "#444",
          color: "#dfdfdf",
        },
        font: "inherit",
        borderRadius: 16,
        "&:disabled": {
          cursor: "not-allowed",
          backgroundColor: "#000",
          borderRadius: 0,
        },
      },
      props.style
    ),
    onClick: props.onClick,
    disabled: props.onClick === undefined,
    children: props.children,
  });

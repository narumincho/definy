import * as React from "react";
import { CSSObject, css } from "@emotion/css";

export type Props = {
  onClick?: () => void;
  style?: CSSObject;
};

export const Button: React.FC<Props> = (props) => (
  <button
    className={css(
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
      },
      props.style
    )}
    onClick={props.onClick}
  >
    {props.children}
  </button>
);
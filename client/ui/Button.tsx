import * as React from "react";
import { CSSObject, css } from "@emotion/css";

export const Button: React.FC<{
  onClick?: () => void;
  style?: CSSObject;
}> = (props) => (
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

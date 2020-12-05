import { SerializedStyles, css, jsx } from "@emotion/react";
import { FunctionComponent } from "react";

export const Button: FunctionComponent<{
  onClick: undefined | (() => void);
  css?: SerializedStyles;
}> = (props) =>
  jsx(
    "button",
    {
      onClick: props.onClick,
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
        },
        props.css
      ),
    },
    props.children
  );

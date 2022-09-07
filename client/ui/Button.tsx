import * as React from "react";
import { CSSObject, css } from "@emotion/css";

export type Props = {
  readonly onClick: (() => void) | undefined;
  readonly style?: CSSObject;
  readonly children: React.ReactNode;
};

export const Button = React.memo(
  (props: Props): React.ReactElement => (
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
          font: "inherit",
          borderRadius: 16,
          "&:disabled": {
            cursor: "not-allowed",
            backgroundColor: "#000",
            borderRadius: 0,
          },
        },
        props.style
      )}
      onClick={props.onClick}
      disabled={props.onClick === undefined}
    >
      {props.children}
    </button>
  )
);
Button.displayName = "Button";

import React from "https://esm.sh/react@18.2.0";
import { css } from "../cssInJs/mod.ts";

export type Props = {
  readonly onClick: (() => void) | undefined;
  readonly style?: unknown;
  readonly children: React.ReactNode;
};

export const Button = (props: Props): React.ReactElement => (
  <button
    className={css(
      {
        cursor: "pointer",
        border: "none",
        padding: 8,
        "text-align": "left",
        "font-size": 16,
        "background-color": "#333",
        color: "#ddd",
        "border-radius": 16,
      },
      {
        hover: {
          "background-color": "#444",
          color: "#dfdfdf",
        },
        disabled: {
          cursor: "not-allowed",
          "background-color": "#000",
          "border-radius": 0,
        },
      }
    )}
    onClick={props.onClick}
    disabled={props.onClick === undefined}
  >
    {props.children}
  </button>
);

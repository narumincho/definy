import React from "https://esm.sh/react@18.2.0";
import { c, toStyleAndHash } from "../cssInJs/mod.ts";

export type Props = {
  readonly onClick: (() => void) | undefined;
  readonly style?: unknown;
  readonly children: React.ReactNode;
};

const style = toStyleAndHash(
  {
    cursor: "pointer",
    border: "none",
    padding: 8,
    textAlign: "left",
    fontSize: 16,
    backgroundColor: "#333",
    color: "#ddd",
    borderRadius: 16,
  },
  {
    hover: {
      backgroundColor: "#444",
      color: "#dfdfdf",
    },
    disabled: {
      cursor: "not-allowed",
      backgroundColor: "#000",
      borderRadius: 0,
    },
  },
);

export const Button = (props: Props): React.ReactElement => (
  <button
    className={c(style)}
    onClick={props.onClick}
    disabled={props.onClick === undefined}
  >
    {props.children}
  </button>
);

import React from "https://esm.sh/react@18.2.0";
import { StyleSheet, css } from "https://esm.sh/aphrodite@2.4.0/no-important";

export type Props = {
  readonly onClick: (() => void) | undefined;
  readonly style?: unknown;
  readonly children: React.ReactNode;
};

const styles = StyleSheet.create({
  button: {
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
});

export const Button = (props: Props): React.ReactElement => (
  <button
    className={css(styles.button)}
    onClick={props.onClick}
    disabled={props.onClick === undefined}
  >
    {props.children}
  </button>
);

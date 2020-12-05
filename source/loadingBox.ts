import { css, jsx as h, keyframes } from "@emotion/react";
import { FunctionComponent } from "react";

export type Props = {
  readonly message: string;
};

export const LoadingBox: FunctionComponent<Props> = (props) =>
  h(
    "div",
    {
      css: css({
        display: "grid",
        overflow: "hidden",
        justifyItems: "center",
      }),
    },
    [
      props.message,
      h(
        "div",
        {
          key: "definy",
          css: css({
            width: 96,
            height: 96,
            display: "grid",
            justifyItems: "center",
            alignItems: "center",
            borderRadius: "50%",
            animation: `1s ${rotateAnimation} infinite linear`,
            fontSize: 24,
            padding: 8,
            backgroundColor: "#333",
            color: "#ddd",
          }),
        },
        "Definy"
      ),
    ]
  );

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;

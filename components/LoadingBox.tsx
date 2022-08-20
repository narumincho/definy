import * as React from "react";
import { keyframes } from "@emotion/react";

export const LoadingBoxCenter = (props: {
  readonly message: string;
}): React.ReactElement => (
  <div
    css={{
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    }}
  >
    <LoadingBox message={props.message} />
  </div>
);

const LoadingBox: React.FC<{ message: string }> = (props) => (
  <div
    css={{
      display: "grid",
      overflow: "hidden",
      justifyItems: "center",
    }}
  >
    <div>{props.message}</div>
    <div
      css={{
        width: 128,
        height: 128,
        display: "grid",
        justifyItems: "center",
        alignItems: "center",
        borderRadius: "50%",
        animation: `3s ${rotateAnimation} infinite linear`,
        fontSize: 24,
        padding: 8,
        backgroundColor: "#333",
        color: "#ddd",
      }}
    >
      definy
    </div>
  </div>
);

const rotateAnimation = keyframes`
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(1turn);
    }
  `;

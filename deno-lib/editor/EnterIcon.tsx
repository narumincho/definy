import React from "https://esm.sh/react@18.2.0?pin=v99";
import { toStyleAndHash, useCssInJs } from "../cssInJs/mod.tsx";

export const EnterIcon = (props: {
  readonly stroke: string;
  readonly height: number;
}) => {
  const c = useCssInJs();
  return (
    <svg
      viewBox="0 0 38 32"
      className={c(
        toStyleAndHash({ stroke: props.stroke, height: props.height }),
      )}
    >
      <polygon points="4,4 34,4 34,28 12,28 12,16 4,16" fill="none"></polygon>
      <path d="M30,8 V20 H16 L18,18 M16,20 L18,22" fill="none"></path>
    </svg>
  );
};

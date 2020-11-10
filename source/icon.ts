import { FunctionComponent, createElement as h } from "react";
import styled from "styled-components";

type IconType = "Requesting" | "Loading";
type Props = {
  readonly iconType: IconType;
  readonly className?: string;
};

export const Icon: FunctionComponent<Props> = (props) => {
  switch (props.iconType) {
    case "Requesting":
      return h(
        Icon_,
        { viewBox: "0 0 40 40", className: props.className },
        new Array(5).fill(0).map((_, index) =>
          h(
            "circle",
            {
              cx: "20",
              cy: (index * 10).toString(),
              fill: "transparent",
              key: index.toString(),
              r: "3",
              stroke: "#eee",
            },
            h("animate", {
              attributeName: "cy",
              dur: "0.2",
              repeatCount: "indefinite",
              values:
                (index * 10 - 5).toString() + ";" + (index * 10 + 5).toString(),
            })
          )
        )
      );
    case "Loading":
      return h(
        Icon_,
        { viewBox: "0 0 40 40", className: props.className },
        h(
          "circle",
          { cx: "20", cy: "20", r: "8", stroke: "#eee" },
          h("animate", {
            attributeName: "r",
            dur: "1",
            repeatCount: "indefinite",
            values: "12;0",
            key: "r-anim",
          }),
          h("animate", {
            attributeName: "stroke",
            dur: "1",
            repeatCount: "indefinite",
            values: "#eee;transparent",
            key: "stroke-anim",
          })
        )
      );
  }
};

const Icon_ = styled.svg({
  width: 32,
  height: 32,
});

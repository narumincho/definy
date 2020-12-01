import { SerializedStyles, css, jsx as h } from "@emotion/react";
import { FunctionComponent } from "react";

type IconType = "Requesting" | "Loading";

export const Icon: FunctionComponent<{
  readonly iconType: IconType;
  readonly css?: SerializedStyles;
}> = (props) =>
  h(
    "svg",
    {
      viewBox: "0 0 40 40",
      css: css(
        {
          width: 32,
          height: 32,
        },
        props.css
      ),
    },
    iconContent(props.iconType)
  );

const iconContent = (
  iconType: IconType
): ReadonlyArray<React.ReactSVGElement> => {
  switch (iconType) {
    case "Requesting":
      return new Array(5).fill(0).map((_, index) =>
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
      );

    case "Loading":
      return [
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
        ),
      ];
  }
};

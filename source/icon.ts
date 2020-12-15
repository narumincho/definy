import { SerializedStyles, css, jsx as h } from "@emotion/react";
import { c, circle, svg } from "./view/viewUtil";
import { Element } from "./view/view";
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
          { cx: "20", cy: "20", r: "8", stroke: "#eee", key: "loading" },
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

export const icon = (iconType: IconType): Element<never> => {
  switch (iconType) {
    case "Loading":
      return svgElement(loadingIconContent);
    case "Requesting":
      return svgElement(requestingIconContent);
  }
};

const svgElement = (
  children: ReadonlyMap<string, Element<never>>
): Element<never> =>
  svg(
    {
      viewBox: { x: 0, y: 0, width: 40, height: 40 },
    },
    children
  );

const loadingIconContent: ReadonlyMap<string, Element<never>> = c([
  [
    "loading-circle",
    circle({
      cx: 20,
      cy: 20,
      r: 8,
      stroke: "#eee",
      fill: "none",
      animations: [
        {
          attributeName: "r",
          dur: 1,
          from: 12,
          to: 0,
        },
        {
          attributeName: "stroke",
          dur: 1,
          from: "#eee",
          to: "transparent",
        },
      ],
    }),
  ],
]);

const requestingIconContent: ReadonlyMap<string, Element<never>> = c(
  new Array(5).fill(0).map(
    (_, index) =>
      [
        index.toString(),
        circle<never>({
          cx: 20,
          cy: index * 10,
          fill: "transparent",
          r: 3,
          stroke: "#eee",
          animations: [
            {
              attributeName: "cy",
              dur: 0.2,
              from: index * 10 - 5,
              to: index * 10 + 5,
            },
          ],
        }),
      ] as const
  )
);

import { c, circle, svg } from "@narumincho/html/source/viewUtil";
import { Element } from "@narumincho/html/source/view";

type IconType = "Requesting" | "Loading";

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

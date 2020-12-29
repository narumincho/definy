import { c, div } from "./view/viewUtil";
import { Element } from "./view/view";
import { box } from "./ui";
import { mapMapValue } from "./util";

export const createProductEditor = (
  elementMap: ReadonlyMap<string, Element<never>>
): Element<never> =>
  box(
    {
      direction: "y",
      padding: 0,
      border: { width: 1, color: "#ddd" },
    },
    mapMapValue(elementMap, (element, name) =>
      box(
        {
          padding: 16,
          direction: "y",
        },
        c([
          ["name", div({}, name)],
          ["value", element],
        ])
      )
    )
  );

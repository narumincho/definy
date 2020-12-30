import { box, text } from "./ui";
import { Element } from "./view/view";
import { c } from "./view/viewUtil";
import { mapMapValue } from "./util";

export const productEditor = <Message>(
  elementMap: ReadonlyMap<string, Element<Message>>
): Element<Message> =>
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
          ["name", text(name)],
          ["value", element],
        ])
      )
    )
  );

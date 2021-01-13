import { box, text } from "./ui";
import { Element } from "./view/view";
import { c } from "./view/viewUtil";

export interface ProductItem<Message> {
  readonly name: string;
  readonly element: Element<Message>;
  readonly isSelected: boolean;
  readonly selectMessage?: Message;
}

export const productEditor = <Message>(
  itemList: ReadonlyArray<ProductItem<Message>>
): Element<Message> =>
  box(
    {
      direction: "y",
      padding: 0,
    },
    new Map(
      itemList.map((item): readonly [string, Element<Message>] => [
        item.name,
        box(
          {
            padding: 16,
            direction: "y",
            border: {
              width: 2,
              color: item.isSelected ? "red" : "#000",
            },
            borderRadius: 8,
            click:
              item.isSelected || item.selectMessage === undefined
                ? undefined
                : {
                    message: item.selectMessage,
                    stopPropagation: true,
                  },
          },
          c([
            ["name", text(item.name)],
            ["value", item.element],
          ])
        ),
      ])
    )
  );

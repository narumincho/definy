import { box, text } from "./ui";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { button } from "./button";

export type Message<ItemMessage> =
  | {
      tag: "Add";
    }
  | {
      tag: "Delete";
      index: number;
    }
  | {
      tag: "Item";
      index: number;
      itemMessage: ItemMessage;
    };

const messageItem = <ItemMessage>(
  itemMessage: ItemMessage,
  index: number
): Message<ItemMessage> => ({
  tag: "Item",
  index,
  itemMessage,
});

/** リストの中身を Message によって変更する. API が 全置換えするような仕様ならこれを使う */
export const update = <Item, ItemMessage>(
  itemUpdate: (item: Item, itemMessage: ItemMessage) => Item,
  itemInit: Item,
  maxCount: number,
  list: ReadonlyArray<Item>,
  message: Message<ItemMessage>
): ReadonlyArray<Item> => {
  switch (message.tag) {
    case "Add":
      return [...list, itemInit].slice(0, maxCount);
    case "Delete":
      return [
        ...list.slice(0, message.index),
        ...list.slice(message.index + 1),
      ];
    case "Item": {
      const oldItem = list[message.index];
      if (oldItem === undefined) {
        return list;
      }
      return [
        ...list.slice(0, message.index),
        itemUpdate(oldItem, message.itemMessage),
        ...list.slice(message.index + 1),
      ];
    }
  }
};

export const view = <Item, ItemMessage>(
  name: string,
  editor: (itemName: string, item: Item) => Element<ItemMessage>,
  maxCount: number,
  list: ReadonlyArray<Item>
): Element<Message<ItemMessage>> => {
  return box<Message<ItemMessage>>(
    {
      padding: 0,
      direction: "y",
    },
    c([
      ...list.map((item, index): readonly [
        string,
        Element<Message<ItemMessage>>
      ] => [
        index.toString(),
        box(
          {
            padding: 4,
            direction: "x",
            xGridTemplate: [{ _: "OneFr" }, { _: "Fix", value: 32 }],
          },
          c([
            [
              "item",
              elementMap(
                editor(name + "-" + index.toString(), item),
                (message) => messageItem(message, index)
              ),
            ],
            ["delete", deleteButton(index)],
          ])
        ),
      ]),
      [
        "addButton",
        list.length >= maxCount
          ? text("最大個数 " + maxCount.toString() + " です")
          : addButton,
      ],
    ])
  );
};

const deleteButton = <ItemMessage>(
  index: number
): Element<Message<ItemMessage>> =>
  button<Message<ItemMessage>>(
    {
      click: { tag: "Delete", index },
    },
    "x"
  );

const addButton: Element<Message<never>> = button<Message<never>>(
  {
    click: { tag: "Add" },
  },
  "+"
);

import { SelectBoxSelection, box, selectBox, text } from "./ui";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { button } from "./button";

export type Selection<ItemSelection> =
  | {
      tag: "Self";
    }
  | {
      tag: "Item";
      index: number;
      itemSelection: ItemSelection;
    };

export type Message<ItemState> =
  | {
      tag: "Add";
    }
  | {
      tag: "Delete";
      index: number;
    }
  | {
      tag: "DeleteAll";
    }
  | {
      tag: "Item";
      index: number;
      itemMessage: ItemState;
    };

const messageItem = <ItemMessage>(
  itemMessage: ItemMessage,
  index: number
): Message<ItemMessage> => ({
  tag: "Item",
  index,
  itemMessage,
});

export const view = <Item, ItemSelection>(
  itemView: (
    item: Item,
    itemSelection: ItemSelection | undefined
  ) => Element<ItemSelection>,
  list: ReadonlyArray<Item>,
  selection: Selection<ItemSelection> | undefined
): Element<Selection<ItemSelection>> => {
  return selectBox<Selection<ItemSelection>>(
    {
      padding: 0,
      direction: "y",
      selection: selectionToSelectBoxSelection(selection),
      selectMessage: { tag: "Self" },
    },
    c([
      ...list.map((item, index): readonly [
        string,
        Element<Selection<ItemSelection>>
      ] => [
        index.toString(),
        elementMap(
          itemView(
            item,
            selection?.tag === "Item" && selection.index === index
              ? selection.itemSelection
              : undefined
          ),
          (itemSelection): Selection<ItemSelection> => ({
            tag: "Item",
            index,
            itemSelection,
          })
        ),
      ]),
    ])
  );
};

const selectionToSelectBoxSelection = <ItemSelection>(
  selection: Selection<ItemSelection> | undefined
): SelectBoxSelection => {
  if (selection === undefined) {
    return "notSelected";
  }
  if (selection.tag === "Self") {
    return "selected";
  }
  return "innerSelected";
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
    case "DeleteAll":
      return [];
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

export const editor = <Item, ItemMessage, ItemSelection>(
  name: string,
  itemEditor: (
    itemName: string,
    item: Item,
    itemSelection: ItemSelection | undefined
  ) => Element<ItemMessage>,
  maxCount: number,
  list: ReadonlyArray<Item>,
  selection: Selection<ItemSelection> | undefined
): Element<Message<ItemMessage>> => {
  if (selection === undefined || selection.tag === "Self") {
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
                  itemEditor(name + "-" + index.toString(), item, undefined),
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
        [
          "deleteAll",
          button<Message<ItemMessage>>(
            {
              click: { tag: "DeleteAll" },
            },
            "すべて削除"
          ),
        ],
      ])
    );
  }
  const item = list[selection.index];
  if (item === undefined) {
    return text("編集する値がない in list editor");
  }
  return elementMap(
    itemEditor(
      name + "-" + selection.index.toString(),
      item,
      selection.itemSelection
    ),
    (message) => messageItem(message, selection.index)
  );
};

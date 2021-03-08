import * as a from "../messageAndState";
import { SelectBoxSelection, box, selectBox, text } from "../ui";
import { c, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
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
  if (list.length === 0) {
    return selectBox<Selection<ItemSelection>>(
      {
        padding: 0,
        direction: "y",
        selection: selectionToSelectBoxSelection(selection),
        selectMessage: { tag: "Self" },
        height: 16,
      },
      c([])
    );
  }

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
  index: number,
  listMessageToAppMessage: (listMessage: Message<ItemMessage>) => a.Message
): Element<a.Message> =>
  button<a.Message>(
    {
      click: listMessageToAppMessage({ tag: "Delete", index }),
    },
    "x"
  );

const addButton = <ItemMessage>(
  listMessageToAppMessage: (listMessage: Message<ItemMessage>) => a.Message
) =>
  button<a.Message>(
    {
      click: listMessageToAppMessage({ tag: "Add" }),
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
    itemSelection: ItemSelection | undefined,
    itemMessageToAppMessage: (itemMessage: ItemMessage) => a.Message
  ) => Element<a.Message>,
  maxCount: number,
  list: ReadonlyArray<Item>,
  selection: Selection<ItemSelection> | undefined,
  listMessageToAppMessage: (listMessage: Message<ItemMessage>) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "Self") {
    return box<a.Message>(
      {
        padding: 0,
        direction: "y",
      },
      c([
        ...list.map(
          itemEditorWithDeleteButton(name, itemEditor, listMessageToAppMessage)
        ),
        [
          "addButton",
          list.length >= maxCount
            ? text<a.Message>("最大個数 " + maxCount.toString() + " です")
            : addButton(listMessageToAppMessage),
        ],
        [
          "deleteAll",
          button<a.Message>(
            {
              click: listMessageToAppMessage({ tag: "DeleteAll" }),
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
  return itemEditor(
    name + "-" + selection.index.toString(),
    item,
    selection.itemSelection,
    (message) => listMessageToAppMessage(messageItem(message, selection.index))
  );
};

const itemEditorWithDeleteButton = <Item, ItemMessage, ItemSelection>(
  name: string,
  itemEditor: (
    itemName: string,
    item: Item,
    itemSelection: ItemSelection | undefined,
    itemMessageToAppMessage: (itemMessage: ItemMessage) => a.Message
  ) => Element<a.Message>,
  listMessageToAppMessage: (listMessage: Message<ItemMessage>) => a.Message
) => (item: Item, index: number): readonly [string, Element<a.Message>] => [
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
        itemEditor(name + "-" + index.toString(), item, undefined, (message) =>
          listMessageToAppMessage(messageItem(message, index))
        ),
      ],
      ["delete", deleteButton(index, listMessageToAppMessage)],
    ])
  ),
];

import * as d from "definy-core/source/data";
import { box, text } from "./ui";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { tagEditor } from "./tagEditor";

export type MaybeTag = "Just" | "Nothing";

export type Message<ItemMessage> =
  | {
      tag: "Tag";
      newMaybeTag: MaybeTag;
    }
  | {
      tag: "Item";
      message: ItemMessage;
    };

export type Selection<ContentSelection> =
  | {
      tag: "self";
    }
  | {
      tag: "content";
      contentSelection: ContentSelection;
    };

const messageTag = <ItemMessage>(
  newMaybeTag: MaybeTag
): Message<ItemMessage> => ({
  tag: "Tag",
  newMaybeTag,
});

const messageItem = <ItemMessage>(
  message: ItemMessage
): Message<ItemMessage> => ({
  tag: "Item",
  message,
});

const selectionContent = <ContentSelection>(
  contentSelection: ContentSelection
): Selection<ContentSelection> => ({
  tag: "content",
  contentSelection,
});

export const update = <Item, ItemMessage>(
  maybe: d.Maybe<Item>,
  message: Message<ItemMessage>,
  initItem: Item,
  itemUpdate: (item: Item, itemMessage: ItemMessage) => Item
): d.Maybe<Item> => {
  switch (message.tag) {
    case "Tag":
      if (message.newMaybeTag === "Just") {
        return d.Maybe.Just(initItem);
      }
      return d.Maybe.Nothing();
    case "Item":
      if (maybe._ === "Nothing") {
        return maybe;
      }
      return d.Maybe.Just(itemUpdate(maybe.value, message.message));
  }
};

export const view = <Item, ItemSelection>(
  maybe: d.Maybe<Item>,
  element: (item: Item) => Element<ItemSelection>,
  selection: Selection<ItemSelection> | undefined
): Element<Selection<ItemSelection>> => {
  return box<Selection<ItemSelection>>(
    {
      padding: 0,
      direction: "y",
      click:
        selection?.tag === "self"
          ? undefined
          : {
              message: { tag: "self" },
              stopPropagation: true,
            },
    },
    c<Selection<ItemSelection>>([
      ["tag", text(maybe._)],
      ...(maybe._ === "Just"
        ? ([
            [
              "content",
              elementMap<ItemSelection, Selection<ItemSelection>>(
                element(maybe.value),
                selectionContent
              ),
            ],
          ] as const)
        : []),
    ])
  );
};

export const editor = <Item, ItemMessage, ItemSelection>(
  name: string,
  maybe: d.Maybe<Item>,
  selection: Selection<ItemSelection> | undefined,
  element: (
    itemName: string,
    item: Item,
    itemSelection: ItemSelection | undefined
  ) => Element<ItemMessage>
): Element<Message<ItemMessage>> => {
  if (selection === undefined || selection.tag === "self") {
    return box<Message<ItemMessage>>(
      {
        padding: 0,
        direction: "y",
      },
      c<Message<ItemMessage>>([
        [
          "tag",
          elementMap<MaybeTag, Message<ItemMessage>>(
            tagEditor<MaybeTag>(["Just", "Nothing"], maybe._, name + "-tag"),
            messageTag
          ),
        ],
        ...(maybe._ === "Just"
          ? ([
              [
                "content",
                elementMap<ItemMessage, Message<ItemMessage>>(
                  element(name + "-content", maybe.value, undefined),
                  messageItem
                ),
              ],
            ] as const)
          : []),
      ])
    );
  }

  if (maybe._ === "Nothing") {
    return text("編集する値がなかった! in maybe editor");
  }
  return elementMap<ItemMessage, Message<ItemMessage>>(
    element(name + "-content", maybe.value, selection.contentSelection),
    messageItem
  );
};

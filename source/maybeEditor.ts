import * as d from "definy-core/source/data";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { box } from "./ui";
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

export const view = <Item, ItemMessage>(
  maybe: d.Maybe<Item>,
  element: (item: Item) => Element<ItemMessage>
): Element<Message<ItemMessage>> => {
  return box<Message<ItemMessage>>(
    {
      padding: 0,
      direction: "y",
    },
    c<Message<ItemMessage>>([
      [
        "tag",
        elementMap<MaybeTag, Message<ItemMessage>>(
          tagEditor<MaybeTag>(["Just", "Nothing"], maybe._, "patternParameter"),
          messageTag
        ),
      ],
      ...(maybe._ === "Just"
        ? ([
            [
              "content",
              elementMap<ItemMessage, Message<ItemMessage>>(
                element(maybe.value),
                messageItem
              ),
            ],
          ] as const)
        : []),
    ])
  );
};

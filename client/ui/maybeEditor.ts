import * as a from "../messageAndState";
import * as d from "../../data";
import { SelectBoxSelection, box, selectBox, text } from "../ui";
import { c, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
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

const messageTagFunc = <ItemMessage>(
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
  element: (
    item: Item,
    itemSelection: ItemSelection | undefined
  ) => Element<ItemSelection>,
  selection: Selection<ItemSelection> | undefined
): Element<Selection<ItemSelection>> => {
  return selectBox<Selection<ItemSelection>>(
    {
      padding: 0,
      direction: "y",
      selection: selectionToSelectBoxSelection(selection),
      selectMessage: { tag: "self" },
    },
    c<Selection<ItemSelection>>([
      ["tag", text(maybe._)],
      ...(maybe._ === "Just"
        ? ([
            [
              "content",
              elementMap<ItemSelection, Selection<ItemSelection>>(
                element(
                  maybe.value,
                  selection?.tag === "content"
                    ? selection.contentSelection
                    : undefined
                ),
                selectionContent
              ),
            ],
          ] as const)
        : []),
    ])
  );
};

const selectionToSelectBoxSelection = <ContentSelection>(
  selection: Selection<ContentSelection> | undefined
): SelectBoxSelection => {
  if (selection === undefined) {
    return "notSelected";
  }
  if (selection.tag === "self") {
    return "selected";
  }
  return "innerSelected";
};

export const editor = <Item, ItemMessage, ItemSelection>(
  name: string,
  maybe: d.Maybe<Item>,
  selection: Selection<ItemSelection> | undefined,
  element: (
    itemName: string,
    item: Item,
    itemSelection: ItemSelection | undefined,
    toMessageFuncInElement: (itemMessage: ItemMessage) => a.Message
  ) => Element<a.Message>,
  toMessageFunc: (t: Message<ItemMessage>) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "self") {
    const tagEditorElement: Element<a.Message> = elementMap<
      MaybeTag,
      a.Message
    >(tagEditor<MaybeTag>(["Just", "Nothing"], maybe._, name + "-tag"), (tag) =>
      toMessageFunc(messageTagFunc(tag))
    );
    if (maybe._ === "Just") {
      return box<a.Message>(
        {
          padding: 0,
          direction: "y",
        },
        c([
          ["tag", tagEditorElement],
          [
            "content",
            element(name + "-content", maybe.value, undefined, (itemMessage) =>
              toMessageFunc(messageItem(itemMessage))
            ),
          ],
        ])
      );
    }
    return tagEditorElement;
  }

  if (maybe._ === "Nothing") {
    return text("編集する値がなかった! in maybe editor");
  }
  return element(name + "-content", maybe.value, undefined, (itemMessage) =>
    toMessageFunc(messageItem(itemMessage))
  );
};

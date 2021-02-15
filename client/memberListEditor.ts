import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as typeEditor from "./typeEditor";
import { SelectBoxSelection, box, selectText } from "./ui";
import { c, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { oneLineTextEditor } from "./ui/oneLineTextInput";
import { productEditor } from "./productEditor";

export type ItemMessage =
  | {
      tag: "SetName";
      newName: string;
    }
  | {
      tag: "SetDescription";
      newDescription: string;
    }
  | {
      tag: "SetType";
      newType: d.Type;
    };

export type ListMessage = listEditor.Message<ItemMessage>;

const memberListMaxCount = 256;

const setName = (newName: string): ItemMessage => ({
  tag: "SetName",
  newName,
});

const setDescription = (newDescription: string): ItemMessage => ({
  tag: "SetDescription",
  newDescription,
});

export type ItemSelection =
  | {
      tag: "self";
    }
  | {
      tag: "name";
    }
  | {
      tag: "description";
    }
  | {
      tag: "type";
      typeSelection: typeEditor.Selection;
    };

export type ListSelection = listEditor.Selection<ItemSelection>;

export const update = (member: d.Member, message: ItemMessage): d.Member => {
  switch (message.tag) {
    case "SetName":
      return {
        ...member,
        name: message.newName,
      };
    case "SetDescription":
      return {
        ...member,
        description: message.newDescription,
      };
    case "SetType":
      return {
        ...member,
        type: message.newType,
      };
  }
};

export const listUpdate = (
  list: ReadonlyArray<d.Member>,
  message: listEditor.Message<ItemMessage>
): ReadonlyArray<d.Member> =>
  listEditor.update(
    update,
    {
      name: "initMemberName",
      description: "initMemberDescription",
      type: definyType.int32,
    },
    memberListMaxCount,
    list,
    message
  );

export const itemView = (
  state: a.State,
  typePartId: d.TypePartId,
  member: d.Member,
  selection: ItemSelection | undefined
): Element<ItemSelection> => {
  return box(
    {
      padding: 0,
      click: {
        message: { tag: "self" },
        stopPropagation: true,
      },
      direction: "y",
    },
    c([
      [
        "main",
        productEditor(
          {
            selectBoxOption: {
              selectMessage: { tag: "self" },
              selection: selectionToSelectBoxSelection(selection),
            },
          },
          [
            {
              name: "name",
              element: selectText(
                selection?.tag === "name",
                { tag: "name" },
                member.name
              ),
            },
            {
              name: "description",
              element: selectText(
                selection?.tag === "description",
                { tag: "description" },
                member.description
              ),
            },
            {
              name: "type",
              element: elementMap(
                typeEditor.view(
                  state,
                  typePartId,
                  member.type,
                  selection?.tag === "type"
                    ? selection.typeSelection
                    : undefined
                ),
                (typeSelection: typeEditor.Selection): ItemSelection => ({
                  tag: "type",
                  typeSelection,
                })
              ),
            },
          ]
        ),
      ],
    ])
  );
};

const selectionToSelectBoxSelection = (
  selection: ItemSelection | undefined
): SelectBoxSelection => {
  if (selection === undefined) {
    return "notSelected";
  }
  if (selection.tag === "self") {
    return "selected";
  }
  return "innerSelected";
};

export const listView = (
  state: a.State,
  typePartId: d.TypePartId,
  list: ReadonlyArray<d.Member>,
  selection: listEditor.Selection<ItemSelection> | undefined
): Element<listEditor.Selection<ItemSelection>> =>
  listEditor.view<d.Member, ItemSelection>(
    (item, itemSelection) => itemView(state, typePartId, item, itemSelection),
    list,
    selection
  );

export const itemEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  name: string,
  member: d.Member,
  selection: ItemSelection | undefined,
  messageToAppMessage: (message: ItemMessage) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "self") {
    return productEditor({}, [
      {
        name: "name",
        element: oneLineTextEditor({}, member.name, (newName) =>
          messageToAppMessage(setName(newName))
        ),
      },
      {
        name: "description",
        element: oneLineTextEditor({}, member.description, (newDescription) =>
          messageToAppMessage(setDescription(newDescription))
        ),
      },
      {
        name: "type",
        element: typeEditor.editor(
          state,
          typePartId,
          member.type,
          undefined,
          (newType: d.Type): a.Message =>
            messageToAppMessage({
              tag: "SetType",
              newType,
            })
        ),
      },
    ]);
  }
  if (selection.tag === "name") {
    return oneLineTextEditor({}, member.name, (newName) =>
      messageToAppMessage(setName(newName))
    );
  }
  if (selection.tag === "description") {
    return oneLineTextEditor({}, member.description, (newDescription) =>
      messageToAppMessage(setDescription(newDescription))
    );
  }
  return typeEditor.editor(
    state,
    typePartId,
    member.type,
    selection.typeSelection,
    (newType: d.Type): a.Message =>
      messageToAppMessage({
        tag: "SetType",
        newType,
      })
  );
};

export const editor = (
  name: string,
  state: a.State,
  typePartId: d.TypePartId,
  list: ReadonlyArray<d.Member>,
  selection: listEditor.Selection<ItemSelection> | undefined,
  messageToAppMessage: (message: ListMessage) => a.Message
): Element<a.Message> => {
  return listEditor.editor(
    name,
    (itemName, item, itemSelection, messageFunc) =>
      itemEditor(state, typePartId, itemName, item, itemSelection, messageFunc),
    memberListMaxCount,
    list,
    selection,
    messageToAppMessage
  );
};

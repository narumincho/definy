import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as typeEditor from "./typeEditor";
import { SelectBoxSelection, box, selectText } from "./ui";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { State } from "./messageAndState";
import { oneLineTextEditor } from "./oneLineTextInput";
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
  state: State,
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
                typeEditor.view(state, typePartId, member.type),
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
  state: State,
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
  state: State,
  typePartId: d.TypePartId,
  name: string,
  member: d.Member,
  selection: ItemSelection | undefined
): Element<ItemMessage> => {
  if (selection === undefined || selection.tag === "self") {
    return productEditor({}, [
      {
        name: "name",
        element: oneLineTextEditor({}, member.name, setName),
      },
      {
        name: "description",
        element: oneLineTextEditor({}, member.description, setDescription),
      },
      {
        name: "type",
        element: elementMap(
          typeEditor.view(state, typePartId, member.type),
          (newType: d.Type): ItemMessage => ({
            tag: "SetType",
            newType,
          })
        ),
      },
    ]);
  }
  if (selection.tag === "name") {
    return oneLineTextEditor({}, member.name, setName);
  }
  if (selection.tag === "description") {
    return oneLineTextEditor({}, member.description, setDescription);
  }
  return elementMap(
    typeEditor.editor(state, typePartId, member.type),
    (newType: d.Type): ItemMessage => ({
      tag: "SetType",
      newType,
    })
  );
};

export const editor = (
  name: string,
  state: State,
  typePartId: d.TypePartId,
  list: ReadonlyArray<d.Member>,
  selection: listEditor.Selection<ItemSelection> | undefined
): Element<ListMessage> => {
  return listEditor.editor(
    name,
    (itemName, item, itemSelection) =>
      itemEditor(state, typePartId, itemName, item, itemSelection),
    memberListMaxCount,
    list,
    selection
  );
};

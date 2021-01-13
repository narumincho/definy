import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import * as productEditor from "./productEditor";
import { box, text } from "./ui";
import { Element } from "./view/view";
import { button } from "./button";
import { c } from "./view/viewUtil";
import { oneLineTextEditor } from "./oneLineTextInput";

export type Message =
  | {
      tag: "SetRandomId";
    }
  | {
      tag: "SetName";
      newName: string;
    };

const typeParameterListMaxCount = 8;

export type ListSelection = listEditor.Selection<ItemSelection> | undefined;

export type ItemSelection =
  | {
      tag: "Self";
    }
  | {
      tag: "name";
    }
  | {
      tag: "typePartId";
    };

export const itemView = (
  typeParameter: d.TypeParameter,
  selection: ItemSelection | undefined
): Element<ItemSelection> => {
  return box(
    {
      padding: 0,
      direction: "y",
      border: {
        color: selection?.tag === "Self" ? "red" : "#000",
        width: 2,
      },
    },
    c([
      [
        "item",
        productEditor.productEditor([
          {
            name: "name",
            element: text(typeParameter.name),
            isSelected: selection?.tag === "name",
            selectMessage: { tag: "name" },
          },
          {
            name: "typePartId",
            element: text(typeParameter.typePartId),
            isSelected: selection?.tag === "typePartId",
            selectMessage: { tag: "typePartId" },
          },
        ]),
      ],
    ])
  );
};

export const listView = (
  list: ReadonlyArray<d.TypeParameter>,
  selection: ListSelection
): Element<ListSelection> => listEditor.view(itemView, list, selection);

export const itemUpdate = (
  typeParameter: d.TypeParameter,
  message: Message
): d.TypeParameter => {
  switch (message.tag) {
    case "SetRandomId":
      return {
        typePartId: randomTypePartId(),
        name: typeParameter.name,
      };
    case "SetName":
      return {
        typePartId: typeParameter.typePartId,
        name: message.newName,
      };
  }
};

export const listUpdate = (
  list: ReadonlyArray<d.TypeParameter>,
  message: listEditor.Message<Message>
): ReadonlyArray<d.TypeParameter> =>
  listEditor.update(
    itemUpdate,
    {
      typePartId: randomTypePartId(),
      name: "typeParameterInitName",
    },
    typeParameterListMaxCount,
    list,
    message
  );

const randomTypePartId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("") as d.TypePartId;

const setName = (newName: string): Message => ({
  tag: "SetName",
  newName,
});

export const itemEditor = (
  name: string,
  typeParameter: d.TypeParameter
): Element<Message> => {
  return box(
    { padding: 0, direction: "y" },
    c([
      [
        "id",
        box(
          {
            padding: 0,
            direction: "x",
          },
          c([
            ["view", text(typeParameter.typePartId)],
            [
              "random",
              button<Message>(
                { click: { tag: "SetRandomId" } },
                "ランダムなIDを生成"
              ),
            ],
          ])
        ),
      ],
      ["name", oneLineTextEditor({}, typeParameter.name, setName)],
    ])
  );
};

export const editor = (
  name: string,
  list: ReadonlyArray<d.TypeParameter>,
  selection: ListSelection | undefined
): Element<listEditor.Message<Message>> =>
  listEditor.editor(
    name,
    itemEditor,
    typeParameterListMaxCount,
    list,
    selection
  );

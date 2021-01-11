import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
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

export const update = (
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

const randomTypePartId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("") as d.TypePartId;

const setName = (newName: string): Message => ({
  tag: "SetName",
  newName,
});

export const view = (
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

export const listView = (
  name: string,
  list: ReadonlyArray<d.TypeParameter>
): Element<listEditor.Message<Message>> =>
  listEditor.view(name, view, typeParameterListMaxCount, list);

export const listUpdate = (
  list: ReadonlyArray<d.TypeParameter>,
  message: listEditor.Message<Message>
): ReadonlyArray<d.TypeParameter> =>
  listEditor.update(
    update,
    {
      typePartId: randomTypePartId(),
      name: "typeParameterInitName",
    },
    typeParameterListMaxCount,
    list,
    message
  );

export const detailListView = (
  name: string,
  list: ReadonlyArray<d.TypeParameter>
): Element<listEditor.Message<Message>> =>
  listEditor.detailView(name, view, typeParameterListMaxCount, list);

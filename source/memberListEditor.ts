import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as typeEditor from "./typeEditor";
import { Element } from "./view/view";
import { elementMap } from "./view/viewUtil";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";

export type Message =
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

const setName = (newName: string): Message => ({
  tag: "SetName",
  newName,
});

const setDescription = (newDescription: string): Message => ({
  tag: "SetDescription",
  newDescription,
});

export const update = (member: d.Member, message: Message): d.Member => {
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

export const listUpdate = listEditor.update(update, {
  name: "initMemberName",
  description: "initMemberDescription",
  type: definyType.int32,
});

export const view = (member: d.Member): Element<Message> => {
  return productEditor(
    new Map([
      ["name", oneLineTextEditor(member.name, setName)],
      ["description", oneLineTextEditor(member.description, setDescription)],
      [
        "type",
        elementMap(
          typeEditor.view(member.type),
          (newType: d.Type): Message => ({
            tag: "SetType",
            newType,
          })
        ),
      ],
    ])
  );
};

export const listView: (
  list: ReadonlyArray<d.Member>
) => Element<listEditor.Message<Message>> = listEditor.view(view);

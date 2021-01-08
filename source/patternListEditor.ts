import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import { Element } from "./view/view";
import { div } from "./view/viewUtil";
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
    };

const setName = (name: string): Message => ({ tag: "SetName", newName: name });
const SetDescription = (name: string): Message => ({
  tag: "SetDescription",
  newDescription: name,
});

export const update = (pattern: d.Pattern, message: Message): d.Pattern => {
  switch (message.tag) {
    case "SetName":
      return {
        ...pattern,
        name: message.newName,
      };
    case "SetDescription":
      return {
        ...pattern,
        description: message.newDescription,
      };
  }
};

export const view = (pattern: d.Pattern): Element<Message> => {
  return productEditor(
    new Map([
      ["name", oneLineTextEditor(pattern.name, setName)],
      ["description", oneLineTextEditor(pattern.description, SetDescription)],
      ["body", div({}, pattern.parameter._)],
    ])
  );
};

export const listUpdate = listEditor.update<d.Pattern, Message>(update, {
  name: "initParameterName",
  description: "initParameterDescription",
  parameter: d.Maybe.Nothing<d.Type>(),
});

export const listView = (
  patternList: ReadonlyArray<d.Pattern>
): Element<listEditor.Message<Message>> => listEditor.view(patternList, view);

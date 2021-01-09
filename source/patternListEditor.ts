import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
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
      tag: "UpdateContent";
      newContentType: maybeEditor.Message<d.Type>;
    };

const setName = (name: string): Message => ({ tag: "SetName", newName: name });
const SetDescription = (name: string): Message => ({
  tag: "SetDescription",
  newDescription: name,
});
const updateContent = (
  newContentType: maybeEditor.Message<d.Type>
): Message => ({
  tag: "UpdateContent",
  newContentType,
});

const patternListMaxCount = 256;

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
    case "UpdateContent":
      return {
        ...pattern,
        parameter: maybeEditor.update(
          pattern.parameter,
          message.newContentType,
          definyType.int32,
          (newType) => newType
        ),
      };
  }
};

export const view = (name: string, pattern: d.Pattern): Element<Message> => {
  return productEditor(
    new Map([
      ["name", oneLineTextEditor(pattern.name, setName)],
      ["description", oneLineTextEditor(pattern.description, SetDescription)],
      ["parameter", parameterEditor(name + "-parameter", pattern.parameter)],
    ])
  );
};

const parameterEditor = (
  name: string,
  parameter: d.Maybe<d.Type>
): Element<Message> => {
  return elementMap(
    maybeEditor.view(name, parameter, typeEditor.view),
    updateContent
  );
};

export const listUpdate = (
  list: ReadonlyArray<d.Pattern>,
  message: listEditor.Message<Message>
): ReadonlyArray<d.Pattern> =>
  listEditor.update<d.Pattern, Message>(
    update,
    {
      name: "initParameterName",
      description: "initParameterDescription",
      parameter: d.Maybe.Nothing<d.Type>(),
    },
    patternListMaxCount,
    list,
    message
  );

export const listView = (
  name: string,
  patternList: ReadonlyArray<d.Pattern>
): Element<listEditor.Message<Message>> =>
  listEditor.view(name, view, patternListMaxCount, patternList);

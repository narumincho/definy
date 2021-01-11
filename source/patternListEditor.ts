import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as typeEditor from "./typeEditor";
import { Element } from "./view/view";
import { State } from "./messageAndState";
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

export const view = (
  state: State,
  typePartId: d.TypePartId,
  name: string,
  pattern: d.Pattern
): Element<Message> => {
  return productEditor([
    {
      name: "name",
      element: oneLineTextEditor({}, pattern.name, setName),
      isSelected: false,
    },
    {
      name: "description",
      element: oneLineTextEditor({}, pattern.description, SetDescription),
      isSelected: false,
    },
    {
      name: "parameter",
      element: parameterEditor(
        state,
        typePartId,
        name + "-parameter",
        pattern.parameter
      ),
      isSelected: false,
    },
  ]);
};

const parameterEditor = (
  state: State,
  typePartId: d.TypePartId,
  name: string,
  parameter: d.Maybe<d.Type>
): Element<Message> => {
  return elementMap(
    maybeEditor.view(name, parameter, (v) =>
      typeEditor.view(state, typePartId, v)
    ),
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
  state: State,
  typePartId: d.TypePartId,
  name: string,
  patternList: ReadonlyArray<d.Pattern>
): Element<listEditor.Message<Message>> =>
  listEditor.view(
    name,
    (itemName, item) => view(state, typePartId, itemName, item),
    patternListMaxCount,
    patternList
  );

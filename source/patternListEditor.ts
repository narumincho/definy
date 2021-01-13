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
import { text } from "./ui";

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

export type ListMessage = listEditor.Message<Message>;

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

type ItemSelection =
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
      tag: "typeParameter";
      typeParameterSelection: maybeEditor.Selection<typeEditor.Selection>;
    };

export type ListSelection = listEditor.Selection<ItemSelection>;

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
          typeEditor.update
        ),
      };
  }
};

export const itemView = (
  state: State,
  typePartId: d.TypePartId,
  pattern: d.Pattern,
  selection: ItemSelection | undefined
): Element<ItemSelection> => {
  return productEditor<ItemSelection>([
    {
      name: "name",
      element: text(pattern.name),
      isSelected: selection?.tag === "name",
      selectMessage: { tag: "name" },
    },
    {
      name: "description",
      element: text(pattern.description),
      isSelected: selection?.tag === "description",
      selectMessage: { tag: "description" },
    },
    {
      name: "parameter",
      element: parameterView(
        state,
        typePartId,
        pattern.parameter,
        selection?.tag === "typeParameter"
          ? selection.typeParameterSelection
          : undefined
      ),
      isSelected: false,
    },
  ]);
};

const parameterView = (
  state: State,
  typePartId: d.TypePartId,
  parameter: d.Maybe<d.Type>,
  selection: maybeEditor.Selection<typeEditor.Selection> | undefined
): Element<ItemSelection> => {
  return elementMap(
    maybeEditor.view(
      parameter,
      (item) => typeEditor.view(state, typePartId, item),
      selection
    ),
    (e): ItemSelection => ({
      tag: "typeParameter",
      typeParameterSelection: e,
    })
  );
};

const parameterEditor = (
  state: State,
  typePartId: d.TypePartId,
  name: string,
  parameter: d.Maybe<d.Type>,
  selection: maybeEditor.Selection<typeEditor.Selection> | undefined
): Element<Message> => {
  return elementMap<maybeEditor.Message<d.Type>, Message>(
    maybeEditor.editor(name, parameter, selection, (parameterTypeName, v) =>
      typeEditor.editor(state, typePartId, v)
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
  patternList: ReadonlyArray<d.Pattern>,
  selection: ListSelection | undefined
): Element<ListSelection> =>
  listEditor.view<d.Pattern, ItemSelection>(
    (item, itemSelection) => itemView(state, typePartId, item, itemSelection),
    patternList,
    selection
  );

export const nameInputEditorId = "name-input";
export const descriptionInputEditorId = "description-input";

export const itemEditor = (
  state: State,
  typePartId: d.TypePartId,
  pattern: d.Pattern,
  name: string,
  selection: ItemSelection | undefined
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
        name,
        pattern.parameter,
        selection?.tag === "typeParameter"
          ? selection.typeParameterSelection
          : undefined
      ),
      isSelected: false,
    },
  ]);
};

export const editor = (
  state: State,
  typePartId: d.TypePartId,
  list: ReadonlyArray<d.Pattern>,
  name: string,
  selection: listEditor.Selection<ItemSelection> | undefined
): Element<ListMessage> =>
  listEditor.editor(
    name,
    (itemName, pattern, itemSelection) =>
      itemEditor(state, typePartId, pattern, itemName, itemSelection),
    patternListMaxCount,
    list,
    selection
  );

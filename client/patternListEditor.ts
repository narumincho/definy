import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as typeEditor from "./typeEditor";
import { SelectBoxSelection, selectBox, text } from "./ui";
import { c, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { oneLineTextEditor } from "./ui/oneLineTextInput";
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
  state: a.State,
  typePartId: d.TypePartId,
  pattern: d.Pattern,
  selection: ItemSelection | undefined
): Element<ItemSelection> => {
  return productEditor<ItemSelection>(
    {
      selectBoxOption: {
        selectMessage: { tag: "self" },
        selection: selectionToSelectBoxSelection(selection),
      },
    },
    [
      {
        name: "name",
        element: selectBox(
          {
            direction: "x",
            padding: 0,
            selectMessage: { tag: "name" },
            selection: selection?.tag === "name" ? "selected" : "notSelected",
          },
          c([["text", text(pattern.name)]])
        ),
      },
      {
        name: "description",
        element: selectBox(
          {
            direction: "x",
            padding: 0,
            selectMessage: { tag: "description" },
            selection:
              selection?.tag === "description" ? "selected" : "notSelected",
          },
          c([["text", text(pattern.description)]])
        ),
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
      },
    ]
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

const parameterView = (
  state: a.State,
  typePartId: d.TypePartId,
  parameter: d.Maybe<d.Type>,
  selection: maybeEditor.Selection<typeEditor.Selection> | undefined
): Element<ItemSelection> => {
  return elementMap(
    maybeEditor.view(
      parameter,
      (item, typeSelection) =>
        typeEditor.view(state, typePartId, item, typeSelection),
      selection
    ),
    (e): ItemSelection => ({
      tag: "typeParameter",
      typeParameterSelection: e,
    })
  );
};

const parameterEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  name: string,
  parameter: d.Maybe<d.Type>,
  selection: maybeEditor.Selection<typeEditor.Selection> | undefined,
  patternSelect: (t: Message) => a.Message
): Element<a.Message> => {
  return maybeEditor.editor<d.Type, d.Type, typeEditor.Selection>(
    name,
    parameter,
    selection,
    (parameterTypeName, v, typeSelection, func) =>
      typeEditor.editor(state, typePartId, v, typeSelection, func),
    (maybeMessage) => patternSelect(updateContent(maybeMessage))
  );
};

export const listUpdate = (
  list: ReadonlyArray<d.Pattern>,
  message: listEditor.Message<Message>
): ReadonlyArray<d.Pattern> =>
  listEditor.update<d.Pattern, Message>(
    update,
    {
      name: "InitPatternName",
      description: "initParameterDescription",
      parameter: d.Maybe.Nothing<d.Type>(),
    },
    patternListMaxCount,
    list,
    message
  );

export const listView = (
  state: a.State,
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
  state: a.State,
  typePartId: d.TypePartId,
  pattern: d.Pattern,
  name: string,
  selection: ItemSelection | undefined,
  messageToAppMessage: (message: Message) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "self") {
    return productEditor({}, [
      {
        name: "name",
        element: oneLineTextEditor({}, pattern.name, (newName) =>
          messageToAppMessage(setName(newName))
        ),
      },
      {
        name: "description",
        element: oneLineTextEditor({}, pattern.description, (newDescription) =>
          messageToAppMessage(SetDescription(newDescription))
        ),
      },
      {
        name: "parameter",
        element: parameterEditor(
          state,
          typePartId,
          name,
          pattern.parameter,
          undefined,
          messageToAppMessage
        ),
      },
    ]);
  }
  if (selection.tag === "name") {
    return oneLineTextEditor({}, pattern.name, (newName) =>
      messageToAppMessage(setName(newName))
    );
  }
  if (selection.tag === "description") {
    return oneLineTextEditor({}, pattern.description, (newDescription) =>
      messageToAppMessage(SetDescription(newDescription))
    );
  }
  return parameterEditor(
    state,
    typePartId,
    name,
    pattern.parameter,
    selection.typeParameterSelection,
    messageToAppMessage
  );
};

export const editor = (
  state: a.State,
  typePartId: d.TypePartId,
  list: ReadonlyArray<d.Pattern>,
  name: string,
  selection: listEditor.Selection<ItemSelection> | undefined,
  messageToAppMessage: (message: ListMessage) => a.Message
): Element<a.Message> =>
  listEditor.editor(
    name,
    (itemName, pattern, itemSelection, messageFunc) =>
      itemEditor(
        state,
        typePartId,
        pattern,
        itemName,
        itemSelection,
        messageFunc
      ),
    patternListMaxCount,
    list,
    selection,
    messageToAppMessage
  );

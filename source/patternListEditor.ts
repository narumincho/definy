import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as typeEditor from "./typeEditor";
import { SelectBoxSelection, selectBox, text } from "./ui";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { State } from "./messageAndState";
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
  state: State,
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
  state: State,
  typePartId: d.TypePartId,
  name: string,
  parameter: d.Maybe<d.Type>,
  selection: maybeEditor.Selection<typeEditor.Selection> | undefined
): Element<Message> => {
  return elementMap<maybeEditor.Message<d.Type>, Message>(
    maybeEditor.editor(
      name,
      parameter,
      selection,
      (parameterTypeName, v, typeSelection) =>
        typeEditor.editor(state, typePartId, v, typeSelection)
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
      name: "InitPatternName",
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
  if (selection === undefined || selection.tag === "self") {
    return productEditor({}, [
      {
        name: "name",
        element: oneLineTextEditor({}, pattern.name, setName),
      },
      {
        name: "description",
        element: oneLineTextEditor({}, pattern.description, SetDescription),
      },
      {
        name: "parameter",
        element: parameterEditor(
          state,
          typePartId,
          name,
          pattern.parameter,
          undefined
        ),
      },
    ]);
  }
  if (selection.tag === "name") {
    return oneLineTextEditor({}, pattern.name, setName);
  }
  if (selection.tag === "description") {
    return oneLineTextEditor({}, pattern.description, SetDescription);
  }
  return parameterEditor(
    state,
    typePartId,
    name,
    pattern.parameter,
    selection.typeParameterSelection
  );
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

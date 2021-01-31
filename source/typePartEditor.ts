import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as typeParameterEditor from "./typeParameterEditor";
import * as typePartBodyEditor from "./typePartBodyEditor";
import { box, selectText, text } from "./ui";
import { c, div, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { multiLineTextEditor } from "./multilineTextInput";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";
import { tagEditor } from "./tagEditor";

export type Message =
  | {
      readonly tag: "ChangeName";
      readonly newName: string;
    }
  | {
      readonly tag: "ChangeDescription";
      readonly newDescription: string;
    }
  | {
      readonly tag: "UpdateAttribute";
      readonly message: maybeEditor.Message<d.TypeAttribute>;
    }
  | {
      readonly tag: "UpdateParameter";
      readonly message: listEditor.Message<typeParameterEditor.Message>;
    }
  | {
      readonly tag: "ChangeBody";
      readonly bodyMessage: typePartBodyEditor.Message;
    }
  | {
      readonly tag: "Select";
      readonly selection: Selection;
    };

export type Selection =
  | {
      tag: "name";
    }
  | {
      tag: "description";
    }
  | {
      tag: "attribute";
      content: maybeEditor.Selection<null>;
    }
  | {
      tag: "parameter";
      content: typeParameterEditor.ListSelection;
    }
  | {
      tag: "body";
      content: typePartBodyEditor.Selection;
    };

const changeName = (newName: string): Message => ({
  tag: "ChangeName",
  newName,
});
const changeDescription = (newDescription: string): Message => ({
  tag: "ChangeDescription",
  newDescription,
});
const updateAttribute = (
  message: maybeEditor.Message<d.TypeAttribute>
): Message => ({
  tag: "UpdateAttribute",
  message,
});
const updateParameter = (
  message: listEditor.Message<typeParameterEditor.Message>
): Message => ({
  tag: "UpdateParameter",
  message,
});
const selectParameter = (
  content: typeParameterEditor.ListSelection
): Message => ({
  tag: "Select",
  selection: {
    tag: "parameter",
    content,
  },
});

export const update = (typePart: d.TypePart, message: Message): d.TypePart => {
  switch (message.tag) {
    case "ChangeName":
      return {
        ...typePart,
        name: message.newName,
      };
    case "ChangeDescription":
      return {
        ...typePart,
        description: message.newDescription,
      };
    case "UpdateAttribute":
      return {
        ...typePart,
        attribute: maybeEditor.update(
          typePart.attribute,
          message.message,
          d.TypeAttribute.AsBoolean,
          (_, attribute) => attribute
        ),
      };
    case "UpdateParameter":
      return {
        ...typePart,
        typeParameterList: typeParameterEditor.listUpdate(
          typePart.typeParameterList,
          message.message
        ),
      };
    case "ChangeBody":
      return {
        ...typePart,
        body: typePartBodyEditor.update(typePart.body, message.bodyMessage),
      };
  }
  return typePart;
};

export const updateSelection = (
  typePart: d.TypePart | undefined,
  selection: Selection | undefined,
  message: Message
): Selection | undefined => {
  switch (message.tag) {
    case "Select":
      focusInput(message.selection);
      return message.selection;
  }
  return selection;
};

const focusInput = (selection: Selection): void => {
  requestAnimationFrame(() => {
    switch (selection.tag) {
      case "name":
        document.getElementById(nameInputEditorId)?.focus();
        return;
      case "description":
        document.getElementById(descriptionInputEditorId)?.focus();
    }
  });
};

export const view = (
  state: a.State,
  typePartId: d.TypePartId,
  selection: Selection | undefined
): Element<Message> => {
  const typePartResource = state.typePartMap.get(typePartId);
  if (typePartResource === undefined) {
    return div({}, "???");
  }
  const selectionText = JSON.stringify(selection);
  switch (typePartResource._) {
    case "Deleted":
      return div({}, "削除された型パーツ");
    case "Requesting":
      return div({}, "取得中");
    case "Unknown":
      return div({}, "取得に失敗した型パーツ");
    case "Loaded":
      return box(
        {
          padding: 0,
          direction: "y",
        },
        c([
          [
            "selection",
            text(
              typeof selectionText === "string"
                ? selectionText
                : "肩パーツ全体を選択している?"
            ),
          ],
          [
            "view",
            typePartViewLoaded(
              state,
              typePartId,
              typePartResource.dataWithTime.data,
              selection
            ),
          ],
        ])
      );
  }
};

const typePartViewLoaded = (
  state: a.State,
  typePartId: d.TypePartId,
  typePart: d.TypePart,
  selection: Selection | undefined
): Element<Message> => {
  return productEditor<Message>({}, [
    {
      name: "name",
      element: selectText(
        selection?.tag === "name",
        {
          tag: "Select",
          selection: {
            tag: "name",
          },
        },
        typePart.name
      ),
    },
    {
      name: "description",
      element: selectText(
        selection?.tag === "description",
        {
          tag: "Select",
          selection: {
            tag: "description",
          },
        },
        typePart.description
      ),
    },
    {
      name: "attribute",
      element: elementMap(
        attributeMaybeView(
          typePart.attribute,
          selection?.tag === "attribute" ? selection.content : undefined
        ),
        (content) => ({
          tag: "Select",
          selection: {
            tag: "attribute",
            content,
          },
        })
      ),
    },
    {
      name: "parameter",
      element: elementMap<typeParameterEditor.ListSelection, Message>(
        typeParameterEditor.listView(
          typePart.typeParameterList,
          selection?.tag === "parameter" ? selection.content : undefined
        ),
        selectParameter
      ),
    },
    {
      name: "body",
      element: elementMap(
        typePartBodyEditor.view(
          state,
          typePartId,
          typePart.body,
          selection?.tag === "body" ? selection.content : undefined
        ),
        (bodySelection) => ({
          tag: "Select",
          selection: {
            tag: "body",
            content: bodySelection,
          },
        })
      ),
    },
  ]);
};

const attributeMaybeView = (
  attributeMaybe: d.Maybe<d.TypeAttribute>,
  selection: maybeEditor.Selection<null> | undefined
): Element<maybeEditor.Selection<null>> =>
  maybeEditor.view(
    attributeMaybe,
    (attribute): Element<null> => text(attribute),
    selection
  );

const attributeMaybeEditor = (
  attributeMaybe: d.Maybe<d.TypeAttribute>,
  selection: maybeEditor.Selection<null> | undefined
): Element<Message> =>
  elementMap<maybeEditor.Message<d.TypeAttribute>, Message>(
    maybeEditor.editor(
      "typePartAttribute",
      attributeMaybe,
      selection,
      attributeEditor
    ),
    updateAttribute
  );

const attributeEditor = (
  name: string,
  attribute: d.TypeAttribute
): Element<d.TypeAttribute> => {
  return tagEditor<d.TypeAttribute>(
    ["AsBoolean", "AsUndefined"],
    attribute,
    "typePartAttribute"
  );
};

export const editor = (
  state: a.State,
  typePartId: d.TypePartId,
  selection: Selection | undefined
): Element<Message> => {
  const typePartResource = state.typePartMap.get(typePartId);
  if (typePartResource === undefined) {
    return div({}, "???");
  }
  switch (typePartResource._) {
    case "Deleted":
      return div({}, "削除された型パーツ");
    case "Requesting":
      return div({}, "取得中");
    case "Unknown":
      return div({}, "取得に失敗した型パーツ");
    case "Loaded":
      return loadedEditor(
        state,
        selection,
        typePartId,
        typePartResource.dataWithTime.data
      );
  }
};

const loadedEditor = (
  state: a.State,
  selection: Selection | undefined,
  typePartId: d.TypePartId,
  typePart: d.TypePart
): Element<Message> => {
  if (selection === undefined) {
    return typePartEditor(state, typePartId, typePart);
  }

  switch (selection.tag) {
    case "name":
      return oneLineTextEditor(
        { id: nameInputEditorId },
        typePart.name,
        changeName
      );
    case "description":
      return multiLineTextEditor(
        { id: descriptionInputEditorId },
        typePart.description,
        changeDescription
      );
    case "attribute":
      return attributeMaybeEditor(typePart.attribute, selection.content);

    case "parameter":
      return elementMap(
        typeParameterEditor.editor(
          "type-paramter",
          typePart.typeParameterList,
          selection.content
        ),
        updateParameter
      );

    case "body":
      return elementMap(
        typePartBodyEditor.editor(
          state,
          typePartId,
          typePart.body,
          selection.content
        ),
        (bodyMessage): Message => ({ tag: "ChangeBody", bodyMessage })
      );
  }
};

const nameInputEditorId = "typePart-name";
const descriptionInputEditorId = "typePart-description-";

const typePartEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePart: d.TypePart
): Element<Message> => {
  return productEditor<Message>({}, [
    {
      name: "name",
      element: oneLineTextEditor(
        { id: nameInputEditorId },
        typePart.name,
        changeName
      ),
    },
    {
      name: "description",
      element: oneLineTextEditor(
        { id: descriptionInputEditorId },
        typePart.description,
        changeDescription
      ),
    },
    {
      name: "attribute",
      element: attributeMaybeEditor(typePart.attribute, undefined),
    },
    {
      name: "parameter",
      element: elementMap<
        listEditor.Message<typeParameterEditor.Message>,
        Message
      >(
        typeParameterEditor.editor(
          "typePartParameter",
          typePart.typeParameterList,
          undefined
        ),
        updateParameter
      ),
    },
    {
      name: "body",
      element: elementMap(
        typePartBodyEditor.editor(state, typePartId, typePart.body, undefined),
        (bodyMessage): Message => ({ tag: "ChangeBody", bodyMessage })
      ),
    },
  ]);
};

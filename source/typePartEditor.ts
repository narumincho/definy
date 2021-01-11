import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as memberListEditor from "./memberListEditor";
import * as patternListEditor from "./patternListEditor";
import * as typeParameterEditor from "./typeParameterEditor";
import { box, text } from "./ui";
import { c, div, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
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
      readonly tag: "ChangeBodyTag";
      readonly newTag: a.TypePartBodyTag;
    }
  | {
      readonly tag: "ChangeBodyKernel";
      readonly newKernel: d.TypePartBodyKernel;
    }
  | {
      readonly tag: "PatternList";
      readonly patternListMessage: listEditor.Message<patternListEditor.Message>;
    }
  | {
      readonly tag: "MemberList";
      readonly memberListMessage: listEditor.Message<memberListEditor.Message>;
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
    case "ChangeBodyTag":
      return {
        ...typePart,
        body: typePartBodyTagToInitTypePartBody(message.newTag),
      };
    case "ChangeBodyKernel":
      return {
        ...typePart,
        body: d.TypePartBody.Kernel(message.newKernel),
      };
    case "PatternList":
      if (typePart.body._ !== "Sum") {
        return typePart;
      }
      return {
        ...typePart,
        body: d.TypePartBody.Sum(
          patternListEditor.listUpdate(
            typePart.body.patternList,
            message.patternListMessage
          )
        ),
      };
    case "MemberList":
      if (typePart.body._ !== "Product") {
        return typePart;
      }
      return {
        ...typePart,
        body: d.TypePartBody.Product(
          memberListEditor.listUpdate(
            typePart.body.memberList,
            message.memberListMessage
          )
        ),
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

const typePartBodyTagToInitTypePartBody = (
  typePartBodyTag: a.TypePartBodyTag
): d.TypePartBody => {
  switch (typePartBodyTag) {
    case "Product":
      return d.TypePartBody.Product([]);
    case "Sum":
      return d.TypePartBody.Sum([]);
    case "Kernel":
      return d.TypePartBody.Kernel(d.TypePartBodyKernel.String);
  }
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
  switch (typePartResource._) {
    case "Deleted":
      return div({}, "削除された型パーツ");
    case "Requesting":
      return div({}, "取得中");
    case "Unknown":
      return div({}, "取得に失敗した型パーツ");
    case "Loaded":
      return typePartEditorLoaded(
        typePartResource.dataWithTime.data,
        selection
      );
  }
};

const typePartEditorLoaded = (
  typePart: d.TypePart,
  selection: Selection | undefined
): Element<Message> => {
  return productEditor<Message>([
    {
      name: "name",
      element: text(typePart.name),
      isSelected: selection?.tag === "name",
      selectMessage: {
        tag: "Select",
        selection: {
          tag: "name",
        },
      },
    },
    {
      name: "description",
      element: text(typePart.description),
      isSelected: selection?.tag === "description",
      selectMessage: {
        tag: "Select",
        selection: {
          tag: "description",
        },
      },
    },
    {
      name: "attribute",
      element: elementMap(
        maybeEditor.view(
          "typePartAttribute",
          typePart.attribute,
          attributeEditor
        ),
        updateAttribute
      ),
      isSelected: false,
    },
    {
      name: "parameter",
      element: elementMap<
        listEditor.Message<typeParameterEditor.Message>,
        Message
      >(
        typeParameterEditor.listView(
          "typePartParameter",
          typePart.typeParameterList
        ),
        updateParameter
      ),
      isSelected: false,
    },
    {
      name: "body",
      element: div<Message>(
        {},
        c([
          ["tag", bodyTagEditor(typePart.body)],
          ["content", bodyContentEditor(typePart.body)],
        ])
      ),
      isSelected: false,
    },
  ]);
};

const attributeEditor = (
  attribute: d.TypeAttribute
): Element<d.TypeAttribute> => {
  return tagEditor<d.TypeAttribute>(
    ["AsBoolean", "AsUndefined"],
    attribute,
    "typePartAttribute"
  );
};

const bodyTagEditor = (typePartBody: d.TypePartBody): Element<Message> => {
  return elementMap(
    tagEditor(["Sum", "Product", "Kernel"], typePartBody._, "typePartBody"),
    (tagEditorMessage): Message => {
      return { tag: "ChangeBodyTag", newTag: tagEditorMessage };
    }
  );
};

const bodyContentEditor = (typePartBody: d.TypePartBody): Element<Message> => {
  switch (typePartBody._) {
    case "Sum":
      return elementMap(
        patternListEditor.listView("patternList", typePartBody.patternList),
        (patternListMessage): Message => ({
          tag: "PatternList",
          patternListMessage,
        })
      );
    case "Product":
      return elementMap(
        memberListEditor.listView("memberList", typePartBody.memberList),
        (memberListMessage): Message => ({
          tag: "MemberList",
          memberListMessage,
        })
      );
    case "Kernel":
      return elementMap(
        tagEditor(
          KernelEditorList,
          typePartBody.typePartBodyKernel,
          "typePartBodyKernel"
        ),
        (newKernel): Message => ({ tag: "ChangeBodyKernel", newKernel })
      );
  }
};

export const KernelEditorList = [
  "Function",
  "Int32",
  "String",
  "Binary",
  "Id",
  "Token",
  "List",
] as const;

export const detailView = (
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
      return loadedDetailView(
        state,
        selection,
        typePartId,
        typePartResource.dataWithTime.data
      );
  }
};

const loadedDetailView = (
  state: a.State,
  selection: Selection | undefined,
  typePartId: d.TypePartId,
  typePart: d.TypePart
): Element<Message> => {
  if (selection === undefined) {
    return view(state, typePartId, selection);
  }
  switch (selection.tag) {
    case "name":
      return box(
        { padding: 8, direction: "y" },
        c([
          ["label", text("typePart-name")],
          [
            "editor",
            oneLineTextEditor(
              { id: nameInputEditorId },
              typePart.name,
              changeName
            ),
          ],
        ])
      );
    case "description":
      return box(
        { padding: 8, direction: "y" },
        c([
          ["label", text("typePart-description")],
          [
            "editor",
            multiLineTextEditor(
              { id: descriptionInputEditorId },
              typePart.description,
              changeDescription
            ),
          ],
        ])
      );
  }
};

const nameInputEditorId = "typePart-name";
const descriptionInputEditorId = "typePart-description-";

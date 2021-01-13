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
      readonly memberListMessage: listEditor.Message<memberListEditor.ItemMessage>;
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
      return typePartViewLoaded(
        state,
        typePartId,
        typePartResource.dataWithTime.data,
        selection
      );
  }
};

const typePartViewLoaded = (
  state: a.State,
  typePartId: d.TypePartId,
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
      isSelected: selection?.tag === "attribute",
      selectMessage: {
        tag: "Select",
        selection: {
          tag: "attribute",
          content: { tag: "self" },
        },
      },
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
      isSelected: selection?.tag === "parameter",
      selectMessage: {
        tag: "Select",
        selection: {
          tag: "parameter",
          content: { tag: "Self" },
        },
      },
    },
    {
      name: "body",
      element: bodyEditor(state, typePartId, typePart.body),
      isSelected: selection?.tag === "body",
      selectMessage: {
        tag: "Select",
        selection: {
          tag: "body",
        },
      },
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

const bodyEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody
) => {
  return div<Message>(
    {},
    c([
      ["tag", text(typePartBody._)],
      ["content", bodyContentEditor(state, typePartId, typePartBody)],
    ])
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

const bodyContentEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody
): Element<Message> => {
  switch (typePartBody._) {
    case "Sum":
      return elementMap(
        patternListEditor.editor(
          state,
          typePartId,
          typePartBody.patternList,
          "patternList",
          undefined
        ),
        (patternListMessage): Message => ({
          tag: "PatternList",
          patternListMessage,
        })
      );
    case "Product":
      return elementMap(
        memberListEditor.editor(
          "memberList",
          state,
          typePartId,
          typePartBody.memberList,
          undefined
        ),
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

const bodyDetailEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody
) => {
  return div<Message>(
    {},
    c([
      ["tag", bodyTagEditor(typePartBody)],
      ["content", bodyContentEditor(state, typePartId, typePartBody)],
    ])
  );
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
    return box(
      { padding: 8, direction: "y" },
      c([
        ["label", text("型パーツ. データの構造を定義する")],
        ["editor", typePartEditor(state, typePartId, undefined)],
      ])
    );
  }
  switch (selection.tag) {
    case "name":
      return box(
        { padding: 8, direction: "y" },
        c([
          [
            "label",
            text(
              "型パーツの名前. ユーザーが認識するために用意している. コンピュータは TypePartId で識別する"
            ),
          ],
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
          ["label", text("型パーツの説明文")],
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
    case "attribute":
      return box(
        { padding: 8, direction: "y" },
        c([
          [
            "label",
            text(
              "型パーツの属性.  BoolをTypeScriptのbooleanとして扱ってほしいなど, 代数的データ型として表現できるが, 出力する言語でもとから用意されている標準のものを使ってほしいときに指定する"
            ),
          ],
          [
            "editor",
            attributeMaybeEditor(typePart.attribute, selection.content),
          ],
        ])
      );
    case "parameter":
      return box(
        { padding: 8, direction: "y" },
        c([
          ["label", text("型パラメーター")],
          [
            "editor",
            elementMap(
              typeParameterEditor.editor(
                "type-paramter",
                typePart.typeParameterList,
                selection.content
              ),
              updateParameter
            ),
          ],
        ])
      );
    case "body":
      return box(
        { padding: 8, direction: "y" },
        c([
          [
            "label",
            text("型パーツの本体. 型パーツをどういう構造で表現するか記述する"),
          ],
          ["editor", bodyDetailEditor(state, typePartId, typePart.body)],
        ])
      );
  }
};

const nameInputEditorId = "typePart-name";
const descriptionInputEditorId = "typePart-description-";

const typePartEditor = (
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
        state,
        typePartId,
        typePartResource.dataWithTime.data,
        selection
      );
  }
};

const typePartEditorLoaded = (
  state: a.State,
  typePartId: d.TypePartId,
  typePart: d.TypePart,
  selection: Selection | undefined
): Element<Message> => {
  return productEditor<Message>([
    {
      name: "name",
      element: oneLineTextEditor(
        { id: nameInputEditorId },
        typePart.name,
        changeName
      ),
      isSelected: false,
    },
    {
      name: "description",
      element: oneLineTextEditor(
        { id: descriptionInputEditorId },
        typePart.description,
        changeDescription
      ),
      isSelected: false,
    },
    {
      name: "attribute",
      element: attributeMaybeEditor(
        typePart.attribute,
        selection?.tag === "attribute" ? selection.content : undefined
      ),
      isSelected: false,
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
          selection?.tag === "parameter" ? selection.content : undefined
        ),
        updateParameter
      ),
      isSelected: false,
    },
    {
      name: "body",
      element: bodyDetailEditor(state, typePartId, typePart.body),
      isSelected: false,
    },
  ]);
};

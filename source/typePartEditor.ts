import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import * as maybeEditor from "./maybeEditor";
import * as memberListEditor from "./memberListEditor";
import * as patternListEditor from "./patternListEditor";
import * as typeParameterEditor from "./typeParameterEditor";
import { c, div, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
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
  appInterface: a.State,
  typePartId: d.TypePartId
): Element<Message> => {
  const typePartResource = appInterface.typePartMap.get(typePartId);
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
      return typePartEditorLoaded(typePartResource.dataWithTime.data);
  }
};

const typePartEditorLoaded = (typePart: d.TypePart): Element<Message> => {
  return productEditor<Message>(
    new Map([
      ["name", oneLineTextEditor(typePart.name, changeName)],
      [
        "description",
        oneLineTextEditor(typePart.description, changeDescription),
      ],
      [
        "attribute",
        elementMap(
          maybeEditor.view(
            "typePartAttribute",
            typePart.attribute,
            attributeEditor
          ),
          updateAttribute
        ),
      ],
      [
        "parameter",
        elementMap<listEditor.Message<typeParameterEditor.Message>, Message>(
          typeParameterEditor.listView(
            "typePartParameter",
            typePart.typeParameterList
          ),
          updateParameter
        ),
      ],
      [
        "body",
        div<Message>(
          {},
          c([
            ["tag", bodyTagEditor(typePart.body)],
            ["content", bodyContentEditor(typePart.body)],
          ])
        ),
      ],
    ])
  );
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

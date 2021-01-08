import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import * as listEditor from "./listEditor";
import * as patternListEditor from "./patternListEditor";
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
    };

const changeName = (newName: string): Message => ({
  tag: "ChangeName",
  newName,
});
const changeDescription = (newDescription: string): Message => ({
  tag: "ChangeDescription",
  newDescription,
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
  appInterface: a.AppInterface,
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
  return productEditor(
    new Map([
      ["name", oneLineTextEditor(typePart.name, changeName)],
      [
        "description",
        oneLineTextEditor(typePart.description, changeDescription),
      ],
      [
        "body",
        div(
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
        patternListEditor.listView(typePartBody.patternList),
        (patternListMessage): Message => ({
          tag: "PatternList",
          patternListMessage,
        })
      );
    case "Product":
      return div({}, "Product");
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

const filedListEditor = () => {};

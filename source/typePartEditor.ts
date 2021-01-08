import * as a from "./appInterface";
import * as d from "definy-core/source/data";
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
      readonly tag: "NoOp";
    };

const changeName = (newName: string): Message => ({
  tag: "ChangeName",
  newName,
});
const changeDescription = (newDescription: string): Message => ({
  tag: "ChangeDescription",
  newDescription,
});

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
        "bodyTag",
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
      return div({}, "Sum");
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

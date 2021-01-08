import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import { c, div, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";
import { sumEditor } from "./sumEditor";

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
      ["bodyType", bodyEditor(typePart.body)],
    ])
  );
};

const bodyEditor = (typePartBody: d.TypePartBody): Element<Message> => {
  return elementMap(
    sumEditor(
      {
        Sum: div({}, "Sum"),
        Product: div({}, "Product"),
        Kernel: div({}, "Kernel"),
      },
      typePartBody._,
      "typePartBody"
    ),
    (sumEditorMessage): Message => {
      if (sumEditorMessage.content !== undefined) {
        return { tag: "NoOp" };
      }
      if (sumEditorMessage.tag === "Product") {
        return { tag: "ChangeBodyTag", newTag: "Product" };
      }
      if (sumEditorMessage.tag === "Sum") {
        return { tag: "ChangeBodyTag", newTag: "Sum" };
      }
      if (sumEditorMessage.tag === "Kernel") {
        return { tag: "ChangeBodyTag", newTag: "Kernel" };
      }
      return { tag: "NoOp" };
    }
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

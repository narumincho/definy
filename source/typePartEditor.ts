import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import { c, div } from "./view/viewUtil";
import { Element } from "./view/view";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";

export type Message =
  | {
      readonly tag: "ChangeName";
      readonly newName: string;
    }
  | {
      readonly tag: "ChangeDescription";
      readonly newDescription: string;
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
      ["bodyType", div({}, typePart.body._)],
    ])
  );
};

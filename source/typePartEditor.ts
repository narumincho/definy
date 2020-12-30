import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import { c, div } from "./view/viewUtil";
import { Element } from "./view/view";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";

export interface Message {
  readonly tag: typeof changeNameTag;
  readonly newName: string;
}

export const changeNameTag = Symbol("TypePartEditorMessage-ChangeName");

const changeName = (newText: string): Message => ({
  tag: changeNameTag,
  newName: newText,
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
      [
        "name",
        div(
          {},
          c([
            ["a", oneLineTextEditor(typePart.name, changeName)],
            ["b", oneLineTextEditor(typePart.name, changeName)],
          ])
        ),
      ],
      ["description", div({}, typePart.description)],
      ["bodyType", div({}, typePart.body._)],
    ])
  );
};

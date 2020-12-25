import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import { Element } from "./view/view";
import { div } from "./view/viewUtil";

export interface Message {
  readonly tag: typeof changeName;
}

export const changeName = Symbol("TypePartEditorMessage-ChangeName");

export const typePartEditor = (
  appInterface: a.AppInterface,
  typePartId: d.TypePartId
): Element<never> => {
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
      return div({}, JSON.stringify(typePartResource.dataWithTime.data));
  }
};

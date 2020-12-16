import * as d from "definy-core/source/data";
import { AppInterface, Message } from "./appInterface";
import { Element } from "./view/view";
import { div } from "./view/viewUtil";

export const init = (userId:UserId) : Message =>{
return {
    tag:
}
}

export const view = (
  appInterface: AppInterface,
  userId: d.UserId
): Element<Message> => {
  return div({}, "ユーザーのページ復活!");
};

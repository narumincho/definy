import { Element } from "./view/view";
import { Message } from "./appInterface";
import { div } from "./view/viewUtil";

export const view = (): Element<Message> => {
  return div({}, "プロジェクトを作成する画面!");
};

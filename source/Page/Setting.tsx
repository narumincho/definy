import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const Setting = (prop: { model: Model }): VNode => {
  if (prop.model.logInState._ !== "LoggedIn") {
    return h("div", {}, ["ログインしていません"]);
  }
  const loggedUserId = prop.model.logInState.accountTokenAndUserId.userId;
  return h("div", {}, [
    h("div", {}, ["設定画面"]),
    ui.User({ model: prop.model, userId: loggedUserId }),
    ui.button(
      {
        onClick: () => {
          prop.model.requestLogOut();
        },
      },
      ["ログアウトする"]
    ),
  ]);
};

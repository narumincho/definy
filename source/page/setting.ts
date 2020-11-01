import * as ui from "../ui";
import { VNode, h } from "maquette";
import { ModelInterface } from "../modelInterface";

export class Model {
  modelInterface: ModelInterface;

  constructor(modelInterface: ModelInterface) {
    this.modelInterface = modelInterface;
  }
}

export const view = (model: Model): VNode => {
  if (model.modelInterface.logInState._ !== "LoggedIn") {
    return h("div", { key: "setting" }, ["ログインしていません"]);
  }
  const loggedUserId =
    model.modelInterface.logInState.accountTokenAndUserId.userId;
  return h("div", { key: "setting" }, [
    h("div", {}, ["設定画面"]),
    ui.user({ modelInterface: model.modelInterface, userId: loggedUserId }),
    ui.button(
      {
        onClick: model.modelInterface.logOut,
      },
      ["ログアウトする"]
    ),
  ]);
};

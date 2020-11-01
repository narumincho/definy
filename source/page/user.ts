import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { ModelInterface } from "../modelInterface";

export class Model {
  constructor(public modelInterface: ModelInterface, public userId: d.UserId) {
    this.modelInterface.requestUser(this.userId);
  }
}

export const view = (model: Model): VNode =>
  h("div", {}, [
    h("div", {}, ["ここなユーザーの詳細ページです"]),
    ui.User(model),
  ]);

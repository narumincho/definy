import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const User = (prop: { model: Model; userId: d.UserId }): VNode =>
  h("div", {}, [
    h("div", {}, ["ここなユーザーの詳細ページです"]),
    ui.User(prop),
  ]);

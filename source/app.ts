import * as about from "./page/about";
import * as core from "definy-core";
import * as createProject from "./page/createProject";
import * as d from "definy-core/source/data";
import * as debug from "./page/debug";
import * as header from "./header";
import * as home from "./page/home";
import * as project from "./page/project";
import * as setting from "./page/setting";
import * as ui from "./ui";
import * as user from "./page/user";
import { PureComponent, ReactNode, createElement as h } from "react";
import { Model } from "./model";

export type Props = {
  model: Model;
};

export class App extends PureComponent<Props> {
  render(): ReactNode {
    return h("span", {}, "アプリ" + this.props.model.language);
  }
}

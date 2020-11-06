import { PureComponent, ReactNode, createElement as h } from "react";
import { Model } from "./model";
import { PageHome } from "./pageHome";

export type Props = {
  model: Model;
};

export class App extends PureComponent<Props> {
  render(): ReactNode {
    switch (this.props.model.location._) {
      case "Home":
        return h(PageHome, { model: this.props.model });
    }
  }
}

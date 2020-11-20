import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Button } from "./button";
import { Icon } from "./icon";
import styled from "styled-components";

const tabList = ["Icon", "Product"] as const;

type Tab = typeof tabList[number];

type Props = Record<never, never>;

type State = {
  tab: Tab;
};

export class PageDebug extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { tab: "Icon" };
  }

  render(): ReactElement {
    return h(StyledPageDebug, {}, [
      h(
        TabList,
        { key: "tab" },
        tabList.map((tab) =>
          this.state.tab === tab
            ? h("div", { key: tab }, tab)
            : h(
                Button,
                {
                  key: tab,
                  onClick: () => {
                    this.setState({ tab });
                  },
                },
                tab
              )
        )
      ),
      h("div", { key: "content" }, h(Content, { tab: this.state.tab })),
    ]);
  }
}

const TabList = styled.div({
  display: "grid",
  alignContent: "start",
});

const StyledPageDebug = styled.div({
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  width: "100%",
});

const Content: FunctionComponent<{ tab: Tab }> = (props) => {
  switch (props.tab) {
    case "Icon":
      return h(IconComponent, {});
    case "Product":
      return h(ProductComponent, {});
  }
};

const IconComponent: FunctionComponent<Record<never, never>> = () =>
  h("div", {}, [
    h("div", { key: "requesting-label" }, "Requesting"),
    h(Icon, { key: "requesting-icon", iconType: "Requesting" }),
    h("div", { key: "loading-label" }, "loading"),
    h(Icon, { key: "loading-icon", iconType: "Loading" }),
  ]);

const ProductComponent: FunctionComponent<Record<never, never>> = () =>
  h("div", {}, "ProductComponentをここで作成する");

import * as d from "definy-core/source/data";
import { Component, VNode, h } from "preact";
import { ModelInterface } from "./modelInterface";
import { Theme } from "./ui";

export type Props = {
  readonly modelInterface: ModelInterface;
  readonly location: d.Location;
  readonly areaTheme: Theme;
};

export class Link extends Component<Props, never> {
  onClick(event: MouseEvent): void {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      event.button === 0
    ) {
      event.preventDefault();
      this.props.modelInterface.jumpSameLanguageLink(this.props.location);
    }
  }

  render(): VNode<Props> {
    return h(
      "a",
      {
        href: this.props.modelInterface
          .sameLanguageLink(this.props.location)
          .toString(),
        onClick: this.onClick,
        class:
          "ui__link" +
          (this.props.areaTheme === "Gray" ? " ui__link--gray" : "") +
          (this.props.areaTheme === "Black" ? " ui__link--black" : "") +
          (this.props.areaTheme === "Active" ? " ui__link--active" : ""),
      },
      this.props.children
    );
  }
}

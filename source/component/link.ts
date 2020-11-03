import * as d from "definy-core/source/data";
import { h, default as preact } from "preact";
import { AreaTheme } from "../ui";
import { ModelInterface } from "../modelInterface";

export type Props = {
  modelInterface: ModelInterface;
  location: d.Location;
  areaTheme: AreaTheme;
};

class Link extends preact.Component<Props, never> {
  onClick(event: MouseEvent) {
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

  render() {
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

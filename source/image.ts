import * as d from "definy-core/source/data";
import { Component, ReactElement } from "react";
import { SerializedStyles, css, jsx as h } from "@emotion/react";
import { Icon } from "./icon";
import { Model } from "./model";

export type Props = {
  readonly model: Model;
  readonly imageToken: d.ImageToken;
  readonly alternativeText: string;
  readonly css?: SerializedStyles;
};

export class Image extends Component<Props, never> {
  constructor(props: Props) {
    super(props);
    props.model.requestImage(props.imageToken);
  }

  render(): ReactElement {
    const blobUrlResource = this.props.model.imageMap.get(
      this.props.imageToken
    );
    if (blobUrlResource === undefined) {
      return h("div", { css: css(imageCss, this.props.css) }, ["..."]);
    }
    switch (blobUrlResource._) {
      case "Loading":
        return h(
          "div",
          { css: css(imageCss, this.props.css) },
          h(Icon, { iconType: "Loading" })
        );
      case "Requesting":
        return h(
          "div",
          { css: css(imageCss, this.props.css) },
          h(Icon, { iconType: "Requesting" })
        );
      case "Unknown":
        return h("div", { css: css(imageCss, this.props.css) }, "取得に失敗");
      case "Loaded":
        return h("img", {
          src: blobUrlResource.data,
          alt: this.props.alternativeText,
          css: css(imageCss, this.props.css),
        });
    }
  }
}

const imageCss = css({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
  width: 16,
  height: 16,
});

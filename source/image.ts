import * as d from "definy-core/source/data";
import { Component, ReactElement } from "react";
import { SerializedStyles, css, jsx as h } from "@emotion/react";
import { Icon } from "./icon";
import { Model } from "./model";
import { div } from "./ui";

export type Props = {
  readonly model: Model;
  readonly imageToken: d.ImageToken;
  readonly alternativeText: string;
  readonly isCircle: boolean;
  readonly width: number;
  readonly height: number;
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
      return div(imageCss(this.props), "...");
    }
    switch (blobUrlResource._) {
      case "Loading":
        return div(imageCss(this.props), h(Icon, { iconType: "Loading" }));
      case "Requesting":
        return div(imageCss(this.props), h(Icon, { iconType: "Requesting" }));
      case "Unknown":
        return div(imageCss(this.props), "取得に失敗");
      case "Loaded":
        return h("img", {
          src: blobUrlResource.data,
          alt: this.props.alternativeText,
          css: imageCss(this.props),
        });
    }
  }
}

const imageCss = (props: Props): SerializedStyles =>
  css({
    display: "grid",
    justifyContent: "center",
    alignContent: "center",
    width: props.width,
    height: props.height,
    borderRadius: props.isCircle ? "50%" : undefined,
  });

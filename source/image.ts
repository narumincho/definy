import * as d from "definy-core/source/data";
import { CSSObject, SerializedStyles, css, jsx as h } from "@emotion/react";
import { Component, ReactElement } from "react";
import { Icon, icon } from "./icon";
import { c, div, img } from "./view/viewUtil";
import { AppInterface } from "./appInterface";
import { Element } from "./view/view";
import { Model } from "./model";

export interface Props {
  readonly model: Model;
  readonly imageToken: d.ImageToken;
  readonly alternativeText: string;
  readonly isCircle: boolean;
  readonly width: number;
  readonly height: number;
}

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
      return h("div", { css: imageCss(this.props) }, "...");
    }
    switch (blobUrlResource._) {
      case "Loading":
        return h(
          "div",
          { css: imageCss(this.props) },
          h(Icon, { iconType: "Loading" })
        );
      case "Requesting":
        return h(
          "div",
          { css: imageCss(this.props) },
          h(Icon, { iconType: "Requesting" })
        );
      case "Unknown":
        return h("div", { css: imageCss(this.props) }, "取得に失敗");
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

export interface Option {
  readonly appInterface: AppInterface;
  readonly imageToken: d.ImageToken;
  readonly alternativeText: string;
  readonly isCircle: boolean;
  readonly width: number;
  readonly height: number;
}

export const image = (option: Option): Element<never> => {
  const blobUrlResource = option.appInterface.imageMap.get(option.imageToken);
  if (blobUrlResource === undefined) {
    return div({ style: imageStyle(option) }, "...");
  }
  switch (blobUrlResource._) {
    case "Loading":
      return div({ style: imageStyle(option) }, c([["icon", icon("Loading")]]));
    case "Requesting":
      return div(
        { style: imageStyle(option) },
        c([["icon", icon("Requesting")]])
      );
    case "Unknown":
      return div({ style: imageStyle(option) }, "取得に失敗");
    case "Loaded":
      return img({
        src: blobUrlResource.data,
        alt: option.alternativeText,
        style: imageStyle(option),
      });
  }
};

const imageStyle = (props: Option): CSSObject => ({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
  width: props.width,
  height: props.height,
  borderRadius: props.isCircle ? "50%" : undefined,
});

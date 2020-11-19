import * as d from "definy-core/source/data";
import { Component, ReactElement, createElement as h } from "react";
import { Icon } from "./icon";
import { Model } from "./model";
import styled from "styled-components";

export type Props = {
  readonly model: Model;
  readonly imageToken: d.ImageToken;
  readonly alternativeText: string;
  readonly className?: string;
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
      return h(ImageDiv, { className: this.props.className }, ["..."]);
    }
    switch (blobUrlResource._) {
      case "Loading":
        return h(
          ImageDiv,
          { className: this.props.className },
          h(Icon, { iconType: "Loading" })
        );
      case "Requesting":
        return h(
          ImageDiv,
          { className: this.props.className },
          h(Icon, { iconType: "Requesting" })
        );
      case "Unknown":
        return h(ImageDiv, { className: this.props.className }, "取得に失敗");
      case "Loaded":
        return h(Image_, {
          src: blobUrlResource.data,
          alt: this.props.alternativeText,
          className: this.props.className,
        });
    }
  }
}

const ImageDiv = styled.div({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
  width: 16,
  height: 16,
});

const Image_ = styled.img({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
  width: 16,
  height: 16,
});

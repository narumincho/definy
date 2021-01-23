import * as d from "definy-core/source/data";
import { c, div, img } from "./view/viewUtil";
import { State } from "./messageAndState";
import { CSSObject } from "@emotion/css";
import { Element } from "./view/view";
import { icon } from "./icon";

export interface Option {
  readonly appInterface: State;
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

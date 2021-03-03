import * as d from "../../data";
import { c, div, image as img } from "@narumincho/html/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "@narumincho/html/view";
import { State } from "../messageAndState";
import * as commonUrl from "../../common/url";

export interface Option {
  readonly state: State;
  readonly imageToken: d.ImageHash;
  readonly alternativeText: string;
  readonly isCircle: boolean;
  readonly width: number;
  readonly height: number;
}

export const image = (option: Option): Element<never> => {
  return img({
    src: commonUrl.pngFileUrl(option.imageToken).toString(),
    alt: option.alternativeText,
    style: imageStyle(option),
  });
};

const imageStyle = (props: Option): CSSObject => ({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
  width: props.width,
  height: props.height,
  borderRadius: props.isCircle ? "50%" : undefined,
});

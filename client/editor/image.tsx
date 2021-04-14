import * as React from "react";
import * as d from "../../data";
import { ElementOperation } from "./commonElement";
import { Image } from "../container/Image";
import { css } from "@emotion/css";

export type ImageSelection = never;
export type ImageValue = {
  readonly alternativeText: string;
  readonly value: d.ImageHash;
};
export type ImageType = {
  readonly canEdit: boolean;
};

const ImageSelectionView: ElementOperation<
  ImageSelection,
  ImageValue,
  ImageType
>["selectionView"] = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        justifyContent: "center",
      })}
    >
      <Image
        imageHash={props.value.value}
        alt={props.value.alternativeText}
        width={512}
        height={316.5}
      />
    </div>
  );
};

const ImageDetailView: ElementOperation<
  ImageSelection,
  ImageValue,
  ImageType
>["detailView"] = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        justifyContent: "center",
      })}
    >
      <Image
        imageHash={props.value.value}
        alt={props.value.alternativeText}
        width={512}
        height={316.5}
      />
    </div>
  );
};

export const imageOperation: ElementOperation<
  ImageSelection,
  ImageValue,
  ImageType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ImageSelectionView,
  detailView: ImageDetailView,
};

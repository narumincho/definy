import * as React from "react";
import * as d from "../../data";
import type { ElementOperation } from "./ElementOperation";
import { Image } from "../ui/Image";
import { css } from "@emotion/css";

export type ImageSelection = never;
export type ImageValue = {
  readonly alternativeText: string;
  readonly value: d.ImageHash;
  readonly canEdit: boolean;
};
export type ImageDataOperation = never;

const ImageSelectionView: ElementOperation<
  ImageSelection,
  ImageValue,
  ImageDataOperation
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
  ImageDataOperation
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
  ImageDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ImageSelectionView,
  detailView: ImageDetailView,
};

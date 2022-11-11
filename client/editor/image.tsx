import * as React from "react";
import * as d from "../../localData";
import type { ElementOperation } from "./ElementOperation";
import { Image } from "../ui/Image";
import { css } from "@emotion/css";
import { util } from "../../deno-lib/npm";

export type ImageSelection = never;
export type ImageValue = {
  readonly alternativeText: string;
  readonly value: d.ImageHash;
  readonly canEdit: boolean;
};

const ImageSelectionView: ElementOperation<
  ImageSelection,
  ImageValue
>["selectionView"] = React.memo((props) => {
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
});
ImageSelectionView.displayName = "ImageSelectionView";

const ImageDetailView: ElementOperation<
  ImageSelection,
  ImageValue
>["detailView"] = React.memo((props) => {
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
});
ImageDetailView.displayName = "ImageDetailView";

export const imageOperation: ElementOperation<ImageSelection, ImageValue> = {
  moveUp: util.neverFunc,
  moveDown: util.neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ImageSelectionView,
  detailView: ImageDetailView,
};

import * as React from "react";
import { ElementOperation } from "./commonElement";
import { css } from "@emotion/css";

export type NumberSelection = never;
export type NumberValue = number;
export type NumberType = {
  readonly canEdit: boolean;
};

const NumberSelectionView: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberType
>["selectionView"] = (props) => {
  return (
    <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
      {props.value}
    </div>
  );
};

const NumberDetailView: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberType
>["detailView"] = (props) => {
  return (
    <div
      className={css({
        color: "limegreen",
      })}
    >
      [type: number] {props.value}
    </div>
  );
};

export const numberOperation: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: NumberSelectionView,
  detailView: NumberDetailView,
};

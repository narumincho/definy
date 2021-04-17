import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";

export type NumberSelection = never;
export type NumberValue = number;
export type NumberType = {
  readonly canEdit: boolean;
};
export type NumberDataOperation =
  | {
      tag: "up";
    }
  | {
      tag: "down";
    };

const NumberSelectionView: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberType,
  NumberDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 16 })}>{props.value}</div>;
};

const NumberDetailView: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberType,
  NumberDataOperation
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
  NumberType,
  NumberDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: NumberSelectionView,
  detailView: NumberDetailView,
};

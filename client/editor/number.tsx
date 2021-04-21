import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";

export type NumberSelection = never;
export type NumberValue = {
  readonly value: number;
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
  NumberDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 16 })}>{props.value.value}</div>;
};

const NumberDetailView: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberDataOperation
>["detailView"] = (props) => {
  return (
    <div
      className={css({
        color: "limegreen",
      })}
    >
      [type: number] {props.value.value}
    </div>
  );
};

export const numberOperation: ElementOperation<
  NumberSelection,
  NumberValue,
  NumberDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: NumberSelectionView,
  detailView: NumberDetailView,
};

import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";
import { util } from "../../deno-lib/npm";

export type NumberSelection = never;
export type NumberValue = {
  readonly value: number;
  readonly canEdit: boolean;
};

const NumberSelectionView: ElementOperation<
  NumberSelection,
  NumberValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 16 })}>{props.value.value}</div>;
});
NumberSelectionView.displayName = "NumberSelectionView";

const NumberDetailView: ElementOperation<
  NumberSelection,
  NumberValue
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
NumberDetailView.displayName = "NumberDetailView";

export const numberOperation: ElementOperation<NumberSelection, NumberValue> = {
  moveUp: util.neverFunc,
  moveDown: util.neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: NumberSelectionView,
  detailView: NumberDetailView,
};

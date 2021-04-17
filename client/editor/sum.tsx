import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";

export type SumSelection = never;
export type SumValue = {
  index: number;
};
export type SumType = {
  valueList: ReadonlyArray<string>;
};
export type SumDataOperation = never;

const SumSelectionView: ElementOperation<
  SumSelection,
  SumValue,
  SumType,
  SumDataOperation
>["selectionView"] = (props) => {
  return (
    <div
      className={css({
        fontSize: 16,
        display: "grid",
        gridAutoFlow: "column",
      })}
    >
      {props.type.valueList.map((value, index) => (
        <div
          key={value}
          className={css({
            backgroundColor: props.value.index === index ? "#aaa" : "#000",
            color: props.value.index === index ? "#000" : "#ddd",
            padding: 4,
            cursor: "pointer",
          })}
        >
          {value}
        </div>
      ))}
    </div>
  );
};

const SumDetailView: ElementOperation<
  SumSelection,
  SumValue,
  SumType,
  SumDataOperation
>["detailView"] = (props) => {
  return (
    <div
      className={css({
        color: "#ddd",
      })}
    >
      option(
      {props.type.valueList.join(",")})
    </div>
  );
};

export const sumOperation: ElementOperation<
  SumSelection,
  SumValue,
  SumType,
  SumDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: SumSelectionView,
  detailView: SumDetailView,
};

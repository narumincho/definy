import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";

export type SumSelection = never;
export type SumValue = {
  readonly valueList: ReadonlyArray<string>;
  readonly index: number;
};
export type SumDataOperation = {
  tag: "select";
  name: string;
};

const SumSelectionView: ElementOperation<
  SumSelection,
  SumValue,
  SumDataOperation
>["selectionView"] = (props) => {
  return (
    <div
      className={css({
        fontSize: 16,
        display: "grid",
        gridTemplateColumns: tagCountToGridTemplateColumns(
          props.value.valueList.length
        ),
        gridAutoFlow: "column",
        border: "solid 1px #333",
      })}
    >
      {props.value.valueList.map((value, index) => (
        <div
          key={value}
          className={css({
            gridArea: tagCountAndIndexToGridArea(
              props.value.valueList.length,
              index
            ),
            backgroundColor: props.value.index === index ? "#aaa" : "#000",
            color: props.value.index === index ? "#000" : "#ddd",
            padding: 8,
            cursor: "pointer",
            textAlign: "center",
          })}
          onClick={() => {
            props.onRequestDataOperation({
              tag: "select",
              name: value,
            });
          }}
        >
          {value}
        </div>
      ))}
    </div>
  );
};

const tagCountToGridTemplateColumns = (tagCount: number): string => {
  return new Array<string>(tagCountToColumnCount(tagCount))
    .fill("1fr")
    .join(" ");
};

const tagCountToColumnCount = (tagCount: number): number => {
  if (tagCount <= 1) {
    return 1;
  }
  if (tagCount === 2) {
    return 2;
  }
  if (tagCount === 3 || tagCount === 5) {
    return 3;
  }
  return 4;
};

const tagCountAndIndexToGridArea = (
  tagCount: number,
  index: number
): string => {
  const columnCount = tagCountToColumnCount(tagCount);
  const x = (index % columnCount) + 1;
  const y = Math.floor(index / columnCount) + 1;
  return `${y} / ${x} / ${y + 1} / ${x + 1}`;
};

const SumDetailView: ElementOperation<
  SumSelection,
  SumValue,
  SumDataOperation
>["detailView"] = (props) => {
  return (
    <div
      className={css({
        color: "#ddd",
      })}
    >
      option(
      {props.value.valueList.join(",")})
    </div>
  );
};

export const sumOperation: ElementOperation<
  SumSelection,
  SumValue,
  SumDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: SumSelectionView,
  detailView: SumDetailView,
};

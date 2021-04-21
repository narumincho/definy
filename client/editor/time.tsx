import * as React from "react";
import * as d from "../../data";
import { TimeCard, TimeDetail } from "../ui/TimeCard";
import type { ElementOperation } from "./ElementOperation";

/**
 * 年, 月, 日, 時, 分, 秒, ミリ秒選べると良いような気がしなくもない
 */
export type TimeSelection = never;

export type TimeValue = {
  readonly time: d.Time;
  readonly canEdit: boolean;
};

export type TimeDataOperation = never;

const TimeSelectionView: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeDataOperation
>["selectionView"] = (props) => {
  return <TimeCard time={props.value.time} />;
};

const TimeDetailView: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeDataOperation
>["detailView"] = (props) => {
  return <TimeDetail time={props.value.time} />;
};

export const timeOperation: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TimeSelectionView,
  detailView: TimeDetailView,
};

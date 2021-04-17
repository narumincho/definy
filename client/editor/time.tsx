import * as React from "react";
import * as d from "../../data";
import { TimeCard, TimeDetail } from "../ui/TimeCard";
import { ElementOperation } from "./commonElement";

/**
 * 年, 月, 日, 時, 分, 秒, ミリ秒選べると良いような気がしなくもない
 */
export type TimeSelection = never;

export type TimeValue = d.Time;

export type TimeType = {
  readonly canEdit: boolean;
};

export type TimeDataOperation = never;

const TimeSelectionView: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeType,
  TimeDataOperation
>["selectionView"] = (props) => {
  return <TimeCard time={props.value} />;
};

const TimeDetailView: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeType,
  TimeDataOperation
>["detailView"] = (props) => {
  return <TimeDetail time={props.value} />;
};

export const timeOperation: ElementOperation<
  TimeSelection,
  TimeValue,
  TimeType,
  TimeDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TimeSelectionView,
  detailView: TimeDetailView,
};

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

const TimeSelectionView: ElementOperation<
  TimeSelection,
  TimeValue
>["selectionView"] = React.memo((props) => {
  return <TimeCard time={props.value.time} />;
});
TimeSelectionView.displayName = "TimeSelectionView";

const TimeDetailView: ElementOperation<
  TimeSelection,
  TimeValue
>["detailView"] = React.memo((props) => {
  return <TimeDetail time={props.value.time} />;
});
TimeDetailView.displayName = "TimeDetailView";

export const timeOperation: ElementOperation<TimeSelection, TimeValue> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TimeSelectionView,
  detailView: TimeDetailView,
};

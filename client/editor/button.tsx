import * as React from "react";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";
import { neverFunc } from "../../common/util";

export type ButtonSelection = never;

export type ButtonValue = {
  readonly text: string;
  readonly onClick: (() => void) | undefined;
};

const ButtonSelectionView: ElementOperation<
  ButtonSelection,
  ButtonValue
>["selectionView"] = React.memo((props) => {
  return <Button onClick={props.value.onClick}>{props.value.text}</Button>;
});
ButtonSelectionView.displayName = "ButtonSelectionView";

const ButtonDetailView: ElementOperation<
  ButtonSelection,
  ButtonValue
>["detailView"] = React.memo((props) => {
  return (
    <div>
      <div>ボタン</div>
      <Button onClick={props.value.onClick}>{props.value.text}</Button>
    </div>
  );
});
ButtonDetailView.displayName = "ButtonDetailView";

export const buttonOperation: ElementOperation<ButtonSelection, ButtonValue> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ButtonSelectionView,
  detailView: ButtonDetailView,
};

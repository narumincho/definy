import * as React from "react";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";
import { util } from "../../deno-lib/npm";

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
  moveUp: util.neverFunc,
  moveDown: util.neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ButtonSelectionView,
  detailView: ButtonDetailView,
};

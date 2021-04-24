import * as React from "react";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";

export type ButtonSelection = never;

export type ButtonValue = {
  readonly text: string;
};

export type ButtonDataOperation = "pressed";

const ButtonSelectionView: ElementOperation<
  ButtonSelection,
  ButtonValue,
  ButtonDataOperation
>["selectionView"] = (props) => {
  return (
    <Button
      onClick={() => {
        props.onRequestDataOperation("pressed");
      }}
    >
      {props.value.text}
    </Button>
  );
};

const ButtonDetailView: ElementOperation<
  ButtonSelection,
  ButtonValue,
  ButtonDataOperation
>["detailView"] = (props) => {
  return (
    <div>
      <div>ボタン</div>
      <Button
        onClick={() => {
          props.onRequestDataOperation("pressed");
        }}
      >
        {props.value.text}
      </Button>
    </div>
  );
};

export const buttonOperation: ElementOperation<
  ButtonSelection,
  ButtonValue,
  ButtonDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ButtonSelectionView,
  detailView: ButtonDetailView,
};

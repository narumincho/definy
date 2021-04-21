import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import { css } from "@emotion/css";

export type TextSelection = never;

export type TextValue = {
  readonly text: string;
  readonly canEdit: boolean;
};

export type TextDataOperation = {
  tag: "edit";
  newValue: string;
};

const TextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 16 })}>{props.value.text}</div>;
};

export const HeadTextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 32 })}>{props.value.text}</div>;
};

const TextDetailView: ElementOperation<
  TextSelection,
  TextValue,
  TextDataOperation
>["detailView"] = (props) => {
  if (props.value.canEdit) {
    return (
      <OneLineTextEditor
        id="text"
        value={props.value.text}
        onChange={(newValue) =>
          props.onRequestDataOperation({ tag: "edit", newValue })
        }
      />
    );
  }
  return (
    <div
      className={css({
        color: "orange",
      })}
    >
      [type: text] {props.value.text}
    </div>
  );
};

export const textOperation: ElementOperation<
  TextSelection,
  TextValue,
  TextDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

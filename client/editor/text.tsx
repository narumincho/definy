import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import { css } from "@emotion/css";

export type TextSelection = never;

export type TextValue = string;

export type TextType = {
  readonly canEdit: boolean;
};

export type TextDataOperation = {
  tag: "edit";
  newValue: string;
};

const TextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextType,
  TextDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 16 })}>{props.value}</div>;
};

export const HeadTextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextType,
  TextDataOperation
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 32 })}>{props.value}</div>;
};

const TextDetailView: ElementOperation<
  TextSelection,
  TextValue,
  TextType,
  TextDataOperation
>["detailView"] = (props) => {
  if (props.type.canEdit) {
    return (
      <OneLineTextEditor
        id="text"
        value={props.value}
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
      [type: text] {props.value}
    </div>
  );
};

export const textOperation: ElementOperation<
  TextSelection,
  TextValue,
  TextType,
  TextDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

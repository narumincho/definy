import * as React from "react";
import { ElementOperation } from "./commonElement";
import { css } from "@emotion/css";
import { useOneLineTextEditor } from "../ui/OneLineTextEditor";

export type TextSelection = never;

export type TextValue = string;

export type TextType = {
  readonly canEdit: boolean;
};

const TextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextType
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 16 })}>{props.value}</div>;
};

export const HeadTextSelectionView: ElementOperation<
  TextSelection,
  TextValue,
  TextType
>["selectionView"] = (props) => {
  return <div className={css({ fontSize: 32 })}>{props.value}</div>;
};

const TextDetailView: ElementOperation<
  TextSelection,
  TextValue,
  TextType
>["detailView"] = (props) => {
  const { element, text } = useOneLineTextEditor({
    id: "text",
    initText: props.value,
    style: {},
  });
  if (props.type.canEdit) {
    return element();
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
  TextType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

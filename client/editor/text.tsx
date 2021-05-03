import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import { css } from "@emotion/css";
import { neverFunc } from "../../common/util";

export type TextSelection = never;

export type TextValue = {
  readonly text: string;
  readonly onChange?: (newText: string) => void;
};

const TextSelectionView: ElementOperation<
  TextSelection,
  TextValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 16 })}>{props.value.text}</div>;
});
TextSelectionView.displayName = "TextSelectionView";

export const HeadTextSelectionView: ElementOperation<
  TextSelection,
  TextValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 32 })}>{props.value.text}</div>;
});
HeadTextSelectionView.displayName = "HeadTextSelectionView";

const TextDetailView: ElementOperation<
  TextSelection,
  TextValue
>["detailView"] = ({ value }) => {
  if (value.onChange !== undefined) {
    return (
      <OneLineTextEditor
        id="text"
        value={value.text}
        onChange={value.onChange}
      />
    );
  }
  return (
    <div
      className={css({
        color: "orange",
      })}
    >
      [type: text] {value.text}
    </div>
  );
};

export const textOperation: ElementOperation<TextSelection, TextValue> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import { css } from "@emotion/css";
import { neverFunc } from "../../common/util";

export type OneLineTextSelection = never;

export type OneLineTextValue = {
  readonly text: string;
  readonly onChange: ((newText: string) => void) | undefined;
};

const TextSelectionView: ElementOperation<
  OneLineTextSelection,
  OneLineTextValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 16 })}>{props.value.text}</div>;
});
TextSelectionView.displayName = "TextSelectionView";

export const HeadTextSelectionView: ElementOperation<
  OneLineTextSelection,
  OneLineTextValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 32 })}>{props.value.text}</div>;
});
HeadTextSelectionView.displayName = "HeadTextSelectionView";

const TextDetailView: ElementOperation<
  OneLineTextSelection,
  OneLineTextValue
>["detailView"] = ({ value }) => {
  return (
    <OneLineTextEditor id="text" value={value.text} onChange={value.onChange} />
  );
};

export const oneLineTextOperation: ElementOperation<
  OneLineTextSelection,
  OneLineTextValue
> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import { css } from "@emotion/css";
import { util } from "../../deno-lib/npm";

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
  if (props.value.text.length === 0) {
    return (
      <div
        className={css({ fontSize: 32, color: "#5c5c5c", fontStyle: "italic" })}
      >
        empty
      </div>
    );
  }
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
  moveUp: util.neverFunc,
  moveDown: util.neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TextSelectionView,
  detailView: TextDetailView,
};

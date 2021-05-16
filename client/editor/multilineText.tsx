import * as React from "react";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";
import { neverFunc } from "../../common/util";

export type MultiLineTextSelection = never;

export type MultiLineTextValue = {
  readonly text: string;
  readonly onChange?: (newText: string) => void;
};

const MultiLineTextSelectionView: ElementOperation<
  MultiLineTextSelection,
  MultiLineTextValue
>["selectionView"] = React.memo(({ value }) => {
  return (
    <div className={css({ fontSize: 16 })}>
      <textarea
        readOnly
        className={css({
          padding: 8,
          fontSize: 16,
          border: "2px solid #222",
          backgroundColor: "#000",
          color: "#ddd",
          borderRadius: 8,
          resize: "none",
          lineHeight: 1.5,
          width: "100%",
          height: 128,

          "&:focus": {
            border: "2px solid #f0932b",
            outline: "none",
          },
        })}
        value={value.text}
      ></textarea>
    </div>
  );
});
MultiLineTextSelectionView.displayName = "TextSelectionView";

export const HeadTextSelectionView: ElementOperation<
  MultiLineTextSelection,
  MultiLineTextValue
>["selectionView"] = React.memo((props) => {
  return <div className={css({ fontSize: 32 })}>{props.value.text}</div>;
});
HeadTextSelectionView.displayName = "HeadTextSelectionView";

const MultiLineTextDetailView: ElementOperation<
  MultiLineTextSelection,
  MultiLineTextValue
>["detailView"] = ({ value }) => {
  if (value.onChange !== undefined) {
    return (
      <MultiLineTextEditorCanEdit
        onChange={value.onChange}
        value={value.text}
      />
    );
  }
  return (
    <div>
      <textarea
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        className={css({
          padding: 8,
          fontSize: 16,
          border: "2px solid #222",
          backgroundColor: "#000",
          color: "#ddd",
          borderRadius: 8,
          resize: "none",
          lineHeight: 1.5,
          width: "100%",
          height: 320,

          "&:focus": {
            border: "2px solid #f0932b",
            outline: "none",
          },
        })}
      >
        {value.text}
      </textarea>
    </div>
  );
};

const MultiLineTextEditorCanEdit: React.VFC<{
  onChange: (text: string) => void;
  value: string;
}> = ({ value, onChange }) => {
  const onChangeTextAreaValue = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );
  return (
    <textarea
      className={css({
        padding: 8,
        fontSize: 16,
        border: "2px solid #222",
        backgroundColor: "#000",
        color: "#ddd",
        borderRadius: 8,
        resize: "none",
        lineHeight: 1.5,
        width: "100%",
        height: 320,

        "&:focus": {
          border: "2px solid #f0932b",
          outline: "none",
        },
      })}
      onChange={onChangeTextAreaValue}
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
    >
      {value}
    </textarea>
  );
};

export const multiLineTextOperation: ElementOperation<
  MultiLineTextSelection,
  MultiLineTextValue
> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: MultiLineTextSelectionView,
  detailView: MultiLineTextDetailView,
};

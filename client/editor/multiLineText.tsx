import * as React from "react";
import { Button } from "../ui/Button";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";
import { neverFunc } from "../../common/util";

export type MultiLineTextSelection = never;

export type MultiLineTextValue = {
  readonly text: string;
  readonly onChange: ((newText: string) => void) | undefined;
};

const selectionViewMaxLine = 20;

const MultiLineTextSelectionView: ElementOperation<
  MultiLineTextSelection,
  MultiLineTextValue
>["selectionView"] = React.memo(({ value }) => {
  if (value.text.length === 0) {
    return (
      <div
        className={css({ fontSize: 16, color: "#5c5c5c", fontStyle: "italic" })}
      >
        empty
      </div>
    );
  }
  const lines = value.text.split("\n");
  const isOver = lines.length > selectionViewMaxLine;
  return (
    <div className={css({ fontSize: 16 })}>
      {lines.slice(selectionViewMaxLine).map((line, index) => (
        <div key={index}>{line}</div>
      ))}
      {isOver ? (
        <div className={css({ fontSize: 16, color: "#ccc" })}>...</div>
      ) : (
        <></>
      )}
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
  const copyText = (): void => {
    navigator.clipboard.writeText(value.text);
  };

  return (
    <div>
      <div>文字列の長さ: {[...value.text].length}</div>
      <Button onClick={copyText}>クリップボードにコピー</Button>
      {value.onChange === undefined ? (
        <MultiLineTextEditorReadonly value={value.text} />
      ) : (
        <MultiLineTextEditorCanEdit
          onChange={value.onChange}
          value={value.text}
        />
      )}
    </div>
  );
};

const MultiLineTextEditorReadonly = (props: {
  value: string;
}): React.ReactElement => {
  return (
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
        height: 480,

        "&:focus": {
          border: "2px solid #f0932b",
          outline: "none",
        },
      })}
      readOnly
      value={props.value}
    />
  );
};

const MultiLineTextEditorCanEdit: React.FC<{
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
      value={value}
    />
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

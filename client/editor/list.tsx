import * as React from "react";
import * as d from "../../data";
import {
  ElementOperation,
  Selection,
  SelectionUpdateResult,
  Type,
  Value,
  commonElement,
} from "./commonElement";
import { Button } from "../ui/Button";
import { css } from "@emotion/css";

export type ListSelection = {
  readonly index: number;
  readonly selection: Selection | undefined;
};

export type ListType = {
  elementType: Type;
};

export type ListValue = {
  readonly items: ReadonlyArray<Value>;
};

const up = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = Math.min(selection.index - 1, value.items.length - 1);
    if (nextIndex < 0) {
      return { tag: "outside" };
    }
    return {
      tag: "inlineMove",
      selection: { index: nextIndex, selection: undefined },
    };
  }
  const result = commonElement.up(selection.selection, item, type.elementType);
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const down = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = selection.index + 1;
    if (value.items.length - 1 < nextIndex) {
      return { tag: "outside" };
    }
    return {
      tag: "inlineMove",
      selection: { index: nextIndex, selection: undefined },
    };
  }
  const result = commonElement.up(selection.selection, item, type.elementType);
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const firstChild = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (item === undefined) {
    return {
      tag: "outside",
    };
  }
  if (selection.selection === undefined) {
    return {
      tag: "inlineMove",
      selection: {
        index: selection.index,
        selection: commonElement.firstChildValue(item, type.elementType),
      },
    };
  }
  const result = commonElement.down(
    selection.selection,
    item,
    type.elementType
  );
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const firstChildValue = (
  value: ListValue,
  type: ListType
): ListSelection | undefined => {
  if (value.items.length > 0) {
    return {
      index: 0,
      selection: undefined,
    };
  }
};

const ListSelectionView: ElementOperation<
  ListSelection,
  ListValue,
  ListType
>["selectionView"] = (props) => {
  const elementType = props.type;
  return (
    <div
      className={css({
        display: "grid",
        padding: 8,
      })}
    >
      {props.value.items.map((v, index) => (
        <div
          key={index}
          onFocus={(event) => {
            event.stopPropagation();
            event.preventDefault();
            props.onChangeSelection({
              index,
              selection: undefined,
            });
          }}
          tabIndex={0}
          className={css({
            padding: 4,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor:
              props.selection !== undefined &&
              props.selection.index === index &&
              props.selection.selection === undefined
                ? "red"
                : "#333",
            borderRadius: 8,
            display: "grid",
            gridTemplateColumns: "1fr 32px",
          })}
        >
          <commonElement.selectionView
            key={index}
            value={v}
            type={elementType.elementType}
            selection={
              props.selection !== undefined && props.selection.index === index
                ? props.selection.selection
                : undefined
            }
            isBig={props.isBig}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
            onChangeSelection={(selection) =>
              props.onChangeSelection({
                index,
                selection,
              })
            }
          />
          <Button>x</Button>
        </div>
      ))}
    </div>
  );
};

const ListDetailView: ElementOperation<
  ListSelection,
  ListValue,
  ListType
>["detailView"] = (props) => {
  return (
    <div>
      子要素をすべて一覧すると左の選択Viewで選択しなくなってしまうので,
      要素をすべて消すボタン, 要素数など表示しておく
    </div>
  );
};

export const listUpdate: ElementOperation<
  ListSelection,
  ListValue,
  ListType
> = {
  up,
  down,
  firstChild,
  firstChildValue,
  selectionView: ListSelectionView,
  detailView: ListDetailView,
};

import * as React from "react";
import * as d from "../../data";
import {
  ElementOperation,
  Selection,
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

const moveUp = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): ListSelection | undefined => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = Math.min(selection.index - 1, value.items.length - 1);
    if (nextIndex < 0) {
      return undefined;
    }
    return { index: nextIndex, selection: undefined };
  }
  return {
    index: selection.index,
    selection: commonElement.moveUp(
      selection.selection,
      item,
      type.elementType
    ),
  };
};

const moveDown = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): ListSelection | undefined => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = selection.index + 1;
    if (value.items.length - 1 < nextIndex) {
      return undefined;
    }
    return { index: nextIndex, selection: undefined };
  }
  return {
    index: selection.index,
    selection: commonElement.moveDown(
      selection.selection,
      item,
      type.elementType
    ),
  };
};

const moveFirstChild = (
  selection: ListSelection | undefined,
  value: ListValue,
  type: ListType
): ListSelection | undefined => {
  if (selection === undefined) {
    if (value.items.length > 0) {
      return {
        index: 0,
        selection: undefined,
      };
    }
    return undefined;
  }
  const item = value.items[selection.index];
  if (item === undefined) {
    return undefined;
  }
  return {
    index: selection.index,
    selection: commonElement.moveFirstChild(
      selection.selection,
      item,
      type.elementType
    ),
  };
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
  if (props.selection === undefined) {
    return (
      <div>
        <div>要素数: {props.value.items.length}</div>
      </div>
    );
  }
  const item = props.value.items[props.selection.index];
  if (item === undefined) {
    return <div>存在しないインデックスを指定している</div>;
  }
  return (
    <div>
      <div>リストインデックス: {props.selection.index}</div>
      <commonElement.detailView
        type={props.type.elementType}
        value={item}
        selection={props.selection.selection}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
      />
    </div>
  );
};

export const listUpdate: ElementOperation<
  ListSelection,
  ListValue,
  ListType
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  selectionView: ListSelectionView,
  detailView: ListDetailView,
};

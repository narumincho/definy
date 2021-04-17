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
  readonly elementType: Type;
  readonly canEdit: boolean;
  readonly isDirectionColumn?: boolean;
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

const moveParent: ElementOperation<
  ListSelection,
  ListValue,
  ListType
>["moveParent"] = (selection, value, type) => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    return undefined;
  }
  return {
    index: selection.index,
    selection: commonElement.moveParent(
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
        gridAutoFlow: props.type.isDirectionColumn ? "column" : "row",
        gridTemplateColumns: props.type.isDirectionColumn
          ? "1fr 1fr 1fr"
          : "1fr",
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
            onRequestDataOperation={props.onRequestDataOperation}
          />
          {props.type.canEdit ? (
            <Button onClick={props.onRequestDataOperation}>x</Button>
          ) : (
            <></>
          )}
        </div>
      ))}
      {props.type.canEdit ? (
        <Button onClick={props.onRequestDataOperation}>+</Button>
      ) : (
        <></>
      )}
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
        {props.type.canEdit ? (
          <Button onClick={props.onRequestDataOperation}>
            すべての要素を削除
          </Button>
        ) : (
          <></>
        )}
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
      {props.selection.selection === undefined && props.type.canEdit ? (
        <Button onClick={props.onRequestDataOperation}>
          リストの要素を削除
        </Button>
      ) : (
        <></>
      )}
      <commonElement.detailView
        type={props.type.elementType}
        value={item}
        selection={props.selection.selection}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
        onRequestAccount={props.onRequestAccount}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    </div>
  );
};

export const listOperation: ElementOperation<
  ListSelection,
  ListValue,
  ListType
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ListSelectionView,
  detailView: ListDetailView,
};

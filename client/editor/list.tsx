import * as React from "react";
import {
  CommonDataOperation,
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

export type ListDataOperation =
  | {
      tag: "addLast";
    }
  | {
      tag: "delete";
      index: number;
    }
  | {
      tag: "childOperation";
      index: number;
      commonDataOperation: CommonDataOperation;
    }
  | {
      tag: "deleteAll";
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
  ListType,
  ListDataOperation
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
  ListType,
  ListDataOperation
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
            accountResource={props.accountResource}
            projectResource={props.projectResource}
            language={props.language}
            onJump={props.onJump}
            onChangeSelection={(selection) =>
              props.onChangeSelection({
                index,
                selection,
              })
            }
            onRequestDataOperation={(commonDataOperation) =>
              props.onRequestDataOperation({
                tag: "childOperation",
                index,
                commonDataOperation,
              })
            }
          />
          {props.type.canEdit ? (
            <Button
              onClick={() =>
                props.onRequestDataOperation({ tag: "delete", index })
              }
            >
              x
            </Button>
          ) : (
            <></>
          )}
        </div>
      ))}
      {props.type.canEdit ? (
        <Button
          onClick={() => props.onRequestDataOperation({ tag: "addLast" })}
        >
          +
        </Button>
      ) : (
        <></>
      )}
    </div>
  );
};

const ListDetailView: ElementOperation<
  ListSelection,
  ListValue,
  ListType,
  ListDataOperation
>["detailView"] = (props) => {
  if (props.selection === undefined) {
    return (
      <div>
        <div>要素数: {props.value.items.length}</div>
        {props.type.canEdit ? (
          <Button
            onClick={() => props.onRequestDataOperation({ tag: "deleteAll" })}
          >
            すべての要素を削除
          </Button>
        ) : (
          <></>
        )}
      </div>
    );
  }
  const index = props.selection.index;
  const item = props.value.items[index];
  if (item === undefined) {
    return <div>存在しないインデックスを指定している</div>;
  }
  return (
    <div>
      <div>リストインデックス: {index}</div>
      {props.selection.selection === undefined && props.type.canEdit ? (
        <Button
          onClick={() => props.onRequestDataOperation({ tag: "delete", index })}
        >
          リストの要素を削除
        </Button>
      ) : (
        <></>
      )}
      <commonElement.detailView
        type={props.type.elementType}
        value={item}
        selection={props.selection.selection}
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(commonDataOperation) =>
          props.onRequestDataOperation({
            tag: "childOperation",
            index,
            commonDataOperation,
          })
        }
      />
    </div>
  );
};

export const listOperation: ElementOperation<
  ListSelection,
  ListValue,
  ListType,
  ListDataOperation
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ListSelectionView,
  detailView: ListDetailView,
};

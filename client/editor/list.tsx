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

const selectionView: React.VFC<{
  readonly value: ListValue;
  readonly type: ListType;
  readonly isBig?: boolean;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly onRequestProject: (projectId: d.ProjectId) => void;
}> = (props) => {
  const elementType = props.type;
  return (
    <div
      className={css({
        display: "grid",
        gridAutoFlow: "column",
        alignItems: "center",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: 8,
      })}
    >
      {props.value.items.map((v, index) => (
        <commonElement.selectionView
          key={index}
          value={v}
          type={elementType.elementType}
          isBig={props.isBig}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
          getProject={props.getProject}
          onRequestProject={props.onRequestProject}
        />
      ))}
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
  selectionView,
};

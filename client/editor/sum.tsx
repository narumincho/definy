import * as React from "react";
import { CommonSelection, CommonValue, commonElement } from "./common";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";

/**
 * なぜ `Selection | undefined` にしないかというと
 * 選択されていないといういみで `undefined` が渡ってくるため
 */
export type SumSelection = {
  tag: "content";
  selection: CommonSelection | undefined;
};

export type SumValue = {
  readonly tagList: ReadonlyArray<SumTagItem>;
  readonly index: number;
  readonly value: CommonValue | undefined;
};

export type SumTagItem = {
  name: string;
  onSelect: () => void;
};

const SumSelectionView: ElementOperation<
  SumSelection,
  SumValue
>["selectionView"] = React.memo((props) => {
  const onChangeSelection = props.onChangeSelection;

  const onFocusContent = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onChangeSelection({
        tag: "content",
        selection: undefined,
      });
    },
    [onChangeSelection]
  );

  const onChangeContentSelection = React.useCallback(
    (commonSelection: CommonSelection): void => {
      onChangeSelection({
        tag: "content",
        selection: commonSelection,
      });
    },
    [onChangeSelection]
  );

  return (
    <div>
      <div
        className={css({
          fontSize: 16,
          display: "grid",
          gridTemplateColumns: tagCountToGridTemplateColumns(
            props.value.tagList.length
          ),
          gridAutoFlow: "column",
          border: "solid 1px #333",
        })}
      >
        {props.value.tagList.map((value, index) => (
          <TagItem
            key={index}
            index={index}
            isSelect={props.value.index === index}
            sumTagItem={value}
            tagNameCount={props.value.tagList.length}
          />
        ))}
      </div>
      {props.value.value === undefined ? (
        <></>
      ) : (
        <div
          className={css({
            borderWidth: 2,
            borderStyle: "solid",
            borderColor:
              props.selection !== undefined &&
              props.selection.selection === undefined
                ? "red"
                : "#333",
            padding: 4,
          })}
          onFocus={onFocusContent}
          tabIndex={0}
        >
          <commonElement.selectionView
            value={props.value.value}
            selection={props.selection?.selection}
            onChangeSelection={onChangeContentSelection}
          />
        </div>
      )}
    </div>
  );
});
SumSelectionView.displayName = "SumSelectionView";

const TagItem: React.VFC<{
  index: number;
  isSelect: boolean;
  sumTagItem: SumTagItem;
  tagNameCount: number;
}> = React.memo(({ index, isSelect, sumTagItem, tagNameCount }) => {
  return (
    <div
      className={css({
        gridArea: tagCountAndIndexToGridArea(tagNameCount, index),
        backgroundColor: isSelect ? "#aaa" : "#000",
        color: isSelect ? "#000" : "#ddd",
        padding: 8,
        cursor: "pointer",
        textAlign: "center",
      })}
      onClick={sumTagItem.onSelect}
    >
      {sumTagItem.name}
    </div>
  );
});
TagItem.displayName = "TagItem";

const tagCountToGridTemplateColumns = (tagCount: number): string => {
  return new Array<string>(tagCountToColumnCount(tagCount))
    .fill("1fr")
    .join(" ");
};

const tagCountToColumnCount = (tagCount: number): number => {
  if (tagCount <= 1) {
    return 1;
  }
  if (tagCount === 2) {
    return 2;
  }
  if (tagCount === 3 || tagCount === 5 || tagCount === 6 || tagCount === 9) {
    return 3;
  }
  return 4;
};

const tagCountAndIndexToGridArea = (
  tagCount: number,
  index: number
): string => {
  const columnCount = tagCountToColumnCount(tagCount);
  const x = (index % columnCount) + 1;
  const y = Math.floor(index / columnCount) + 1;
  return `${y} / ${x} / ${y + 1} / ${x + 1}`;
};

const SumDetailView: ElementOperation<SumSelection, SumValue>["detailView"] =
  React.memo((props) => {
    if (props.selection === undefined) {
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          sum(
          {props.value.tagList.map((item) => item.name).join(",")})
        </div>
      );
    }
    if (props.value.value === undefined) {
      return <div>sum の選択している値がない</div>;
    }
    return (
      <commonElement.detailView
        value={props.value.value}
        selection={props.selection.selection}
      />
    );
  });
SumDetailView.displayName = "SumDetailView";

export const sumOperation: ElementOperation<SumSelection, SumValue> = {
  moveUp: (selection, value) => {
    if (selection.selection === undefined || value.value === undefined) {
      return selection;
    }
    return {
      tag: "content",
      selection: commonElement.moveUp(selection.selection, value.value),
    };
  },
  moveDown: (selection, value) => {
    if (selection.selection === undefined || value.value === undefined) {
      return selection;
    }
    return {
      tag: "content",
      selection: commonElement.moveDown(selection.selection, value.value),
    };
  },
  moveFirstChild: (selection, value) => {
    // 自身を選択してる場合
    if (selection === undefined) {
      if (value.value !== undefined) {
        return {
          tag: "content",
          selection: undefined,
        };
      }
      return undefined;
    }
    // 子要素を選択してる場合
    if (value.value === undefined) {
      return undefined;
    }
    return {
      tag: "content",
      selection: commonElement.moveFirstChild(selection.selection, value.value),
    };
  },
  moveParent: (selection, value) => {
    if (selection.selection === undefined || value.value === undefined) {
      return undefined;
    }
    return {
      tag: "content",
      selection: commonElement.moveParent(selection.selection, value.value),
    };
  },
  selectionView: SumSelectionView,
  detailView: SumDetailView,
};

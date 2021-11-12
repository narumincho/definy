import * as React from "react";
import { CommonSelection, CommonValue, commonElement } from "./common";
import { Button } from "../ui/Button";
import type { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";
import { normalizeSearchText } from "../../common/searchText";
import { useOneLineTextEditor } from "../ui/OneLineTextEditor";

export type ListSelection = {
  readonly index: number;
  readonly selection: CommonSelection | undefined;
};

export type ListValue = {
  readonly items: ReadonlyArray<ListItem>;
  readonly isDirectionColumn?: boolean;
  readonly deleteAll?: () => void;
  readonly deleteAt?: (index: number) => void;
  readonly addInLast?: () => void;
};

export type ListItem = {
  readonly commonValue: CommonValue;
  /** 検索で使用するテキスト */
  readonly searchText: string;
};

/**
 * Editor の list の1つの要素
 * @param commonValue 値. 共通であつかえる
 * @param searchText 検索で使われるテキスト
 */
export const listItem = (
  commonValue: CommonValue,
  searchText: string
): ListItem => ({
  commonValue,
  searchText,
});

const moveUp = (selection: ListSelection, value: ListValue): ListSelection => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = Math.min(selection.index - 1, value.items.length - 1);
    if (nextIndex < 0) {
      return {
        index: value.items.length - 1,
        selection: undefined,
      };
    }
    return { index: nextIndex, selection: undefined };
  }
  return {
    index: selection.index,
    selection: commonElement.moveUp(selection.selection, item.commonValue),
  };
};

const moveDown = (
  selection: ListSelection,
  value: ListValue
): ListSelection => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = selection.index + 1;
    if (value.items.length - 1 < nextIndex) {
      return {
        index: 0,
        selection: undefined,
      };
    }
    return { index: nextIndex, selection: undefined };
  }
  return {
    index: selection.index,
    selection: commonElement.moveDown(selection.selection, item.commonValue),
  };
};

const moveFirstChild = (
  selection: ListSelection | undefined,
  value: ListValue
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
      item.commonValue
    ),
  };
};

const moveParent: ElementOperation<ListSelection, ListValue>["moveParent"] = (
  selection,
  value
) => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    return undefined;
  }
  return {
    index: selection.index,
    selection: commonElement.moveParent(selection.selection, item.commonValue),
  };
};

const ListSelectionView: ElementOperation<
  ListSelection,
  ListValue
>["selectionView"] = React.memo((props) => {
  const { text: searchQueryText, element } = useOneLineTextEditor({
    id: "search",
    initText: "",
  });
  const normalizedSearchQueryText = normalizeSearchText(searchQueryText);

  return (
    <div>
      <div>{element()}</div>
      {searchQueryText === "" ? (
        <></>
      ) : (
        <div>{normalizedSearchQueryText} でフィルター中</div>
      )}
      <div
        className={css({
          display: "grid",
          gridAutoFlow: props.value.isDirectionColumn ? "column" : "row",
          gridTemplateColumns: props.value.isDirectionColumn
            ? "1fr 1fr 1fr"
            : "1fr",
        })}
      >
        {props.value.items.flatMap((v, index) => {
          if (
            normalizeSearchText(v.searchText).includes(
              normalizedSearchQueryText
            )
          ) {
            return [
              <SelectionItem
                key={index}
                index={index}
                onChangeSelection={props.onChangeSelection}
                selection={getListItemSelection(props.selection, index)}
                value={v.commonValue}
                deleteAt={props.value.deleteAt}
              />,
            ];
          }
          return [];
        })}
        {props.value.addInLast === undefined ? (
          <></>
        ) : (
          <Button onClick={props.value.addInLast}>+</Button>
        )}
      </div>
    </div>
  );
});
ListSelectionView.displayName = "ListSelectionView";

const getListItemSelection = (
  listSelection: ListSelection | undefined,
  index: number
): ListItemSelection => {
  if (listSelection === undefined || listSelection.index !== index) {
    return "none";
  }
  if (listSelection.selection === undefined) {
    return "self";
  }
  return listSelection.selection;
};

type ListItemSelection = CommonSelection | "none" | "self";

const SelectionItem: React.VFC<{
  index: number;
  onChangeSelection: (listSelection: ListSelection) => void;
  selection: ListItemSelection;
  value: CommonValue;
  deleteAt: ((index: number) => void) | undefined;
}> = React.memo(({ index, onChangeSelection, selection, value, deleteAt }) => {
  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>): void => {
      event.stopPropagation();
      event.preventDefault();
      onChangeSelection({
        index,
        selection: undefined,
      });
    },
    [index, onChangeSelection]
  );
  const onChangeItemSelection = React.useCallback(
    (s: CommonSelection) => {
      onChangeSelection({
        index,
        selection: s,
      });
    },
    [index, onChangeSelection]
  );
  const onClickDelete = React.useCallback(() => {
    if (deleteAt !== undefined) {
      deleteAt(index);
    }
  }, [index, deleteAt]);

  return (
    <div
      onFocus={onFocus}
      tabIndex={0}
      className={css({
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: selection === "self" ? "red" : "#333",
        borderRadius: 8,
        display: "grid",
        gridTemplateColumns: "1fr auto",
      })}
    >
      <div
        className={css({
          padding: 4,
        })}
      >
        <commonElement.selectionView
          key={index}
          value={value}
          selection={
            selection !== "none" && selection !== "self" ? selection : undefined
          }
          onChangeSelection={onChangeItemSelection}
        />
      </div>
      {deleteAt === undefined ? (
        <></>
      ) : (
        <Button onClick={onClickDelete} style={{ width: 32 }}>
          x
        </Button>
      )}
    </div>
  );
});
SelectionItem.displayName = "SelectionItem";

const ListDetailView: ElementOperation<ListSelection, ListValue>["detailView"] =
  React.memo((props) => {
    if (props.selection === undefined) {
      return (
        <div>
          <div>要素数: {props.value.items.length}</div>
          {props.value.deleteAll === undefined ? (
            <></>
          ) : (
            <Button onClick={props.value.deleteAll}>すべての要素を削除</Button>
          )}
          {props.value.addInLast === undefined ? (
            <></>
          ) : (
            <Button onClick={props.value.addInLast}>
              + 末尾に要素を追加する
            </Button>
          )}
        </div>
      );
    }
    const index = props.selection.index;
    const item = props.value.items[index];
    if (item === undefined) {
      return <div>存在しないインデックスを指定している</div>;
    }
    if (props.selection.selection === undefined) {
      return (
        <div>
          <div>リストインデックス: {index}</div>
        </div>
      );
    }
    return (
      <commonElement.detailView
        value={item.commonValue}
        selection={props.selection.selection}
      />
    );
  });
ListDetailView.displayName = "ListDetailView";

export const listOperation: ElementOperation<ListSelection, ListValue> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ListSelectionView,
  detailView: ListDetailView,
};

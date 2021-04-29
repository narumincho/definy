import * as React from "react";
import * as d from "../../data";
import { CommonDataOperation, Selection, Value, commonElement } from "./common";
import {
  HeadTextSelectionView,
  TextDataOperation,
  TextSelection,
  TextValue,
  textOperation,
} from "./text";
import type { ElementOperation } from "./ElementOperation";
import { Image } from "../ui/Image";
import { css } from "@emotion/css";

export type ProductSelection =
  | {
      tag: "icon";
    }
  | {
      tag: "head";
      selection: TextSelection | undefined;
    }
  | {
      tag: "content";
      index: number;
      selection: Selection | undefined;
    };

export type ProductValue = {
  readonly headItem?: HeadItem;
  readonly items: ReadonlyArray<Item>;
};

export type HeadItem = {
  readonly name: string;
  readonly value: TextValue;
  readonly iconHash?: d.ImageHash;
};

export type Item = {
  readonly name: string;
  readonly value: Value;
};

export type ProductDataOperation =
  | {
      tag: "head";
      textDataOperation: TextDataOperation;
    }
  | {
      tag: "content";
      index: number;
      commonDataOperation: CommonDataOperation;
    };

const moveUp = (
  selection: ProductSelection,
  value: ProductValue
): ProductSelection | undefined => {
  switch (selection.tag) {
    case "icon":
      return undefined;
    case "head": {
      // head の要素がないか, head自体を選択していた場合は外へ
      if (value.headItem === undefined || selection.selection === undefined) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveUp(selection, value.headItem.value),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      // 要素が存在しない, 要素を自体を選択している場合
      if (item === undefined || selection.selection === undefined) {
        const lastIndex = Math.min(selection.index - 1, value.items.length - 1);
        if (lastIndex < 0) {
          if (value.headItem !== undefined) {
            return { tag: "head", selection: undefined };
          }
          return undefined;
        }
        return { tag: "content", index: lastIndex, selection: undefined };
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveUp(selection.selection, item.value),
      };
    }
  }
};

const moveDown = (
  selection: ProductSelection,
  value: ProductValue
): ProductSelection | undefined => {
  switch (selection.tag) {
    case "icon": {
      if (value.headItem !== undefined) {
        return { tag: "head", selection: undefined };
      }
      if (value.items.length >= 1) {
        return { tag: "content", index: 0, selection: undefined };
      }
      return undefined;
    }
    case "head": {
      if (value.headItem === undefined || selection.selection === undefined) {
        if (value.items.length >= 1) {
          return { tag: "content", index: 0, selection: undefined };
        }
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveDown(selection, value.headItem.value),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      if (item === undefined || selection.selection === undefined) {
        const nextIndex = selection.index + 1;
        if (value.items.length <= nextIndex) {
          return undefined;
        }
        return {
          tag: "content",
          index: nextIndex,
          selection: undefined,
        };
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveDown(selection.selection, item.value),
      };
    }
  }
};

const moveFirstChild: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductDataOperation
>["moveFirstChild"] = (
  selection: ProductSelection | undefined,
  value: ProductValue
): ProductSelection | undefined => {
  if (selection === undefined) {
    return firstChildValue(value);
  }
  switch (selection.tag) {
    case "icon": {
      if (
        value.headItem === undefined ||
        value.headItem.iconHash !== undefined
      ) {
        return undefined;
      }
      return { tag: "icon" };
    }
    case "head": {
      if (value.headItem === undefined) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveFirstChild(
          selection.selection,
          value.headItem.value
        ),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      if (item === undefined) {
        return undefined;
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveFirstChild(
          selection.selection,
          item.value
        ),
      };
    }
  }
};

const firstChildValue = (value: ProductValue): ProductSelection | undefined => {
  if (value.headItem !== undefined) {
    return { tag: "head", selection: undefined };
  }
  if (value.items.length !== 0) {
    return { tag: "content", index: 0, selection: undefined };
  }
  return undefined;
};

const moveParent: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductDataOperation
>["moveParent"] = (selection, value) => {
  switch (selection.tag) {
    case "icon": {
      return undefined;
    }
    case "head": {
      if (selection.selection === undefined || value.headItem === undefined) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveParent(selection, value.headItem.value),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      if (selection.selection === undefined || item === undefined) {
        return undefined;
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveParent(selection.selection, item.value),
      };
    }
  }
};

export const ProductSelectionView: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductDataOperation
>["selectionView"] = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gap: 4,
        alignContent: "start",
        padding: 8,
      })}
    >
      {props.value.headItem === undefined ? (
        <></>
      ) : (
        <div
          className={css({
            display: "grid",
            gridAutoFlow: "column",
            gridTemplateColumns:
              props.value.headItem.iconHash === undefined ? "1fr" : "auto 1fr",
          })}
        >
          {props.value.headItem.iconHash === undefined ? (
            <></>
          ) : (
            <div
              className={css({
                display: "grid",
                placeContent: "center",
                borderWidth: 2,
                borderStyle: "solid",
                borderColor:
                  props.selection !== undefined &&
                  props.selection.tag === "icon"
                    ? "red"
                    : "#333",
                borderRadius: 8,
              })}
              onClick={() => {
                props.onChangeSelection({
                  tag: "icon",
                });
              }}
            >
              <Image
                width={32}
                height={32}
                alt="タイトルのアイコン"
                imageHash={props.value.headItem.iconHash}
              />
            </div>
          )}
          <HeadItemView
            onSelect={(selection) => {
              props.onChangeSelection({ tag: "head", selection });
            }}
            name={props.value.headItem.name}
            productSelection={props.selection}
            textValue={props.value.headItem.value}
            onRequestDataOperation={(textDataOperation) =>
              props.onRequestDataOperation({ tag: "head", textDataOperation })
            }
          />
        </div>
      )}
      {props.value.items.map((itemType, index) => {
        const item = props.value.items[index];
        if (item === undefined) {
          return <div>指定したメンバーの値がない {JSON.stringify(item)}</div>;
        }
        return (
          <ItemView
            key={itemType.name}
            onSelect={(selection) => {
              props.onChangeSelection({
                tag: "content",
                index,
                selection,
              });
            }}
            name={itemType.name}
            itemSelection={getContentItemSelection(props.selection, index)}
            value={item.value}
            onRequestDataOperation={(commonDataOperation) =>
              props.onRequestDataOperation({
                tag: "content",
                index,
                commonDataOperation,
              })
            }
          />
        );
      })}
    </div>
  );
};

const getContentItemSelection = (
  productSelection: ProductSelection | undefined,
  index: number
): ItemSelection => {
  if (
    productSelection === undefined ||
    productSelection.tag !== "content" ||
    productSelection.index !== index
  ) {
    return { tag: "none" };
  }
  if (productSelection.selection === undefined) {
    return { tag: "selectSelf" };
  }
  return { tag: "selectInner", selection: productSelection.selection };
};

type ItemSelection =
  | {
      tag: "selectSelf";
    }
  | {
      tag: "selectInner";
      selection: Selection;
    }
  | {
      tag: "none";
    };

const HeadItemView: React.VFC<{
  readonly onSelect: (selection: TextSelection | undefined) => void;
  readonly name: string;
  readonly textValue: TextValue;
  readonly productSelection: ProductSelection | undefined;
  readonly onRequestDataOperation: (operation: TextDataOperation) => void;
}> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (
      props.productSelection !== undefined &&
      props.productSelection.tag === "head" &&
      ref.current !== null
    ) {
      ref.current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [props.productSelection]);

  return (
    <div
      ref={ref}
      className={css({
        padding: 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor:
          props.productSelection !== undefined &&
          props.productSelection.tag === "head"
            ? "red"
            : "#333",
      })}
      onFocus={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(undefined);
      }}
      tabIndex={0}
    >
      <HeadTextSelectionView
        value={props.textValue}
        selection={
          props.productSelection !== undefined &&
          props.productSelection.tag === "head"
            ? props.productSelection.selection
            : undefined
        }
        onChangeSelection={props.onSelect}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    </div>
  );
};

const ItemView: React.VFC<{
  readonly onSelect: (selection: Selection | undefined) => void;
  readonly name: string;
  readonly value: Value;
  readonly itemSelection: ItemSelection;
  readonly onRequestDataOperation: (
    commonDataOperation: CommonDataOperation
  ) => void;
}> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (props.itemSelection.tag === "selectSelf" && ref.current !== null) {
      ref.current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [props.itemSelection]);

  return (
    <div
      ref={ref}
      className={css({
        padding: 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: props.itemSelection.tag === "selectSelf" ? "red" : "#333",
      })}
      onFocus={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(undefined);
      }}
      tabIndex={0}
    >
      <div
        className={css({
          display: "flex",
          gap: 16,
          alignItems: "center",
        })}
      >
        <div
          className={css({
            fontWeight: "bold",
            fontSize: 16,
            color: "#ddd",
          })}
        >
          {props.name}
        </div>
      </div>
      <commonElement.selectionView
        value={props.value}
        selection={
          props.itemSelection.tag === "selectInner"
            ? props.itemSelection.selection
            : undefined
        }
        onChangeSelection={props.onSelect}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    </div>
  );
};

const ProductDetailView: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductDataOperation
>["detailView"] = (props) => {
  if (props.selection === undefined) {
    return <div>product自体を選択している</div>;
  }
  switch (props.selection.tag) {
    case "head":
      if (props.value.headItem === undefined) {
        return <div>headItemがないのに選択している</div>;
      }
      return (
        <textOperation.detailView
          value={props.value.headItem.value}
          selection={props.selection.selection}
          onRequestDataOperation={(textDataOperation) =>
            props.onRequestDataOperation({ tag: "head", textDataOperation })
          }
        />
      );
    case "icon":
      return <div>アイコンを選択してる</div>;
    case "content": {
      const index = props.selection.index;
      const item = props.value.items[index];
      if (item === undefined) {
        return <div>指定した要素が存在しない</div>;
      }
      return (
        <commonElement.detailView
          value={item.value}
          selection={props.selection.selection}
          onRequestDataOperation={(commonDataOperation) =>
            props.onRequestDataOperation({
              tag: "content",
              index,
              commonDataOperation,
            })
          }
        />
      );
    }
  }
};

export const productOperation: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductDataOperation
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ProductSelectionView,
  detailView: ProductDetailView,
};

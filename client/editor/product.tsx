import * as React from "react";
import * as d from "../../localData";
import { CommonSelection, CommonValue, commonElement } from "./common";
import {
  HeadTextSelectionView,
  OneLineTextSelection,
  OneLineTextValue,
  oneLineTextOperation,
} from "./oneLineText";
import type { ElementOperation } from "./ElementOperation";
import { Image } from "../ui/Image";
import { css } from "@emotion/css";

export type ProductSelection =
  | {
      readonly tag: "icon";
    }
  | {
      readonly tag: "head";
      readonly selection: OneLineTextSelection | undefined;
    }
  | {
      readonly tag: "content";
      readonly index: number;
      readonly selection: CommonSelection | undefined;
    };

export type ProductValue = {
  readonly headItem?: HeadItem;
  readonly items: ReadonlyArray<Item>;
};

export type HeadItem = {
  readonly name: string;
  readonly value: OneLineTextValue;
  readonly iconHash?: d.ImageHash;
};

export type Item = {
  readonly name: string;
  readonly value: CommonValue;
};

const moveUp = (
  selection: ProductSelection,
  value: ProductValue
): ProductSelection => {
  switch (selection.tag) {
    case "icon":
      return lastSelectionWithDefault(value);
    case "head": {
      // head の要素がないか, head自体を選択していた場合は外へ
      if (value.headItem === undefined || selection.selection === undefined) {
        return lastSelectionWithDefault(value);
      }
      return {
        tag: "head",
        selection: oneLineTextOperation.moveUp(selection, value.headItem.value),
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
          return lastSelectionWithDefault(value);
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

const lastSelectionWithDefault = (value: ProductValue): ProductSelection => {
  return lastSelection(value) ?? { tag: "head", selection: undefined };
};

/** 最後の要素への移動 */
const lastSelection = (value: ProductValue): ProductSelection | undefined => {
  if (value.items.length <= 0) {
    if (value.headItem === undefined) {
      return undefined;
    }
    return {
      tag: "head",
      selection: undefined,
    };
  }
  return {
    tag: "content",
    index: value.items.length - 1,
    selection: undefined,
  };
};

const moveDown = (
  selection: ProductSelection,
  value: ProductValue
): ProductSelection => {
  switch (selection.tag) {
    case "icon": {
      return firstSelectionWithDefault(value);
    }
    case "head": {
      if (value.headItem === undefined || selection.selection === undefined) {
        if (value.items.length >= 1) {
          return { tag: "content", index: 0, selection: undefined };
        }
        return {
          tag: "head",
          selection: undefined,
        };
      }
      return {
        tag: "head",
        selection: oneLineTextOperation.moveDown(
          selection,
          value.headItem.value
        ),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      if (item === undefined || selection.selection === undefined) {
        const nextIndex = selection.index + 1;
        if (value.items.length <= nextIndex) {
          return firstSelectionWithDefault(value);
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
  ProductValue
>["moveFirstChild"] = (
  selection: ProductSelection | undefined,
  value: ProductValue
): ProductSelection | undefined => {
  if (selection === undefined) {
    return firstSelection(value);
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
        selection: oneLineTextOperation.moveFirstChild(
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

const firstSelectionWithDefault = (value: ProductValue): ProductSelection => {
  return firstSelection(value) ?? { tag: "head", selection: undefined };
};

const firstSelection = (value: ProductValue): ProductSelection | undefined => {
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
  ProductValue
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
        selection: oneLineTextOperation.moveParent(
          selection,
          value.headItem.value
        ),
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
  ProductValue
>["selectionView"] = React.memo((props) => {
  const onChangeSelection = props.onChangeSelection;

  const onClickIcon = React.useCallback(() => {
    onChangeSelection({
      tag: "icon",
    });
  }, [onChangeSelection]);

  const onClickHeadItem = React.useCallback(
    (textSelection: OneLineTextSelection | undefined) => {
      onChangeSelection({ tag: "head", selection: textSelection });
    },
    [onChangeSelection]
  );

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
              onClick={onClickIcon}
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
            onSelect={onClickHeadItem}
            name={props.value.headItem.name}
            productSelection={props.selection}
            textValue={props.value.headItem.value}
          />
        </div>
      )}
      {props.value.items.map((item, index) => {
        return (
          <ItemView
            key={item.name}
            onSelect={(selection) => {
              props.onChangeSelection({
                tag: "content",
                index,
                selection,
              });
            }}
            name={item.name}
            itemSelection={getContentItemSelection(props.selection, index)}
            value={item.value}
            index={index}
          />
        );
      })}
    </div>
  );
});
ProductSelectionView.displayName = "ProductSelectionView";

const getContentItemSelection = (
  productSelection: ProductSelection | undefined,
  index: number
): ItemSelection => {
  if (
    productSelection === undefined ||
    productSelection.tag !== "content" ||
    productSelection.index !== index
  ) {
    return "none";
  }
  if (productSelection.selection === undefined) {
    return "self";
  }
  return productSelection.selection;
};

type ItemSelection = "none" | "self" | CommonSelection;

const HeadItemView: React.VFC<{
  readonly onSelect: (selection: OneLineTextSelection | undefined) => void;
  readonly name: string;
  readonly textValue: OneLineTextValue;
  readonly productSelection: ProductSelection | undefined;
}> = React.memo((props) => {
  const onSelect = props.onSelect;
  const ref = React.useRef<HTMLDivElement>(null);
  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(undefined);
    },
    [onSelect]
  );

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
      onFocus={onFocus}
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
      />
    </div>
  );
});
HeadItemView.displayName = "HeadItemView";

const ItemView: React.VFC<{
  readonly onSelect: (selection: CommonSelection | undefined) => void;
  readonly name: string;
  readonly value: CommonValue;
  readonly itemSelection: ItemSelection;
  readonly index: number;
}> = React.memo((props) => {
  const onSelect = props.onSelect;

  const ref = React.useRef<HTMLDivElement>(null);
  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(undefined);
    },
    [onSelect]
  );

  React.useEffect(() => {
    if (props.itemSelection === "self" && ref.current !== null) {
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
        borderColor: props.itemSelection === "self" ? "red" : "#333",
      })}
      onFocus={onFocus}
      tabIndex={0}
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
      <div
        className={css({
          padding: 8,
        })}
      >
        <commonElement.selectionView
          value={props.value}
          selection={
            props.itemSelection !== "self" && props.itemSelection !== "none"
              ? props.itemSelection
              : undefined
          }
          onChangeSelection={props.onSelect}
        />
      </div>
    </div>
  );
});
ItemView.displayName = "ItemView";

const ProductDetailView: ElementOperation<
  ProductSelection,
  ProductValue
>["detailView"] = React.memo((props) => {
  if (props.selection === undefined) {
    return <div>product自体を選択している</div>;
  }
  switch (props.selection.tag) {
    case "head":
      if (props.value.headItem === undefined) {
        return <div>headItemがないのに選択している</div>;
      }
      return (
        <oneLineTextOperation.detailView
          value={props.value.headItem.value}
          selection={props.selection.selection}
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
        />
      );
    }
  }
});
ProductDetailView.displayName = "ProductDetailView";

export const productOperation: ElementOperation<
  ProductSelection,
  ProductValue
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ProductSelectionView,
  detailView: ProductDetailView,
};

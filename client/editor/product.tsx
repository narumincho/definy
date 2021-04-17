import * as React from "react";
import * as d from "../../data";
import {
  ElementOperation,
  Selection,
  Type,
  Value,
  commonElement,
} from "./commonElement";
import {
  HeadTextSelectionView,
  TextSelection,
  TextType,
  TextValue,
  textOperation,
} from "./text";
import { Image } from "../container/Image";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
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

export type ProductType = {
  headItem?: {
    name: string;
    textType: TextType;
    hasIcon: boolean;
  };
  items: ReadonlyArray<{ name: string; type: Type }>;
};

export type ProductValue = {
  headItem?: HeadItem;
  items: ReadonlyArray<Value>;
};

export type HeadItem = {
  value: TextValue;
  iconHash?: d.ImageHash;
};

const moveUp = (
  selection: ProductSelection,
  product: ProductValue,
  type: ProductType
): ProductSelection | undefined => {
  switch (selection.tag) {
    case "icon":
      return undefined;
    case "head": {
      // head の要素がないか, head自体を選択していた場合は外へ
      if (
        product.headItem === undefined ||
        selection.selection === undefined ||
        type.headItem === undefined
      ) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveUp(
          selection,
          product.headItem.value,
          type.headItem.textType
        ),
      };
    }
    case "content": {
      const item = product.items[selection.index];
      const itemType = type.items[selection.index];
      // 要素が存在しない, 要素を自体を選択している場合
      if (
        item === undefined ||
        selection.selection === undefined ||
        itemType === undefined
      ) {
        const lastIndex = Math.min(selection.index - 1, type.items.length - 1);
        if (lastIndex < 0) {
          if (type.headItem !== undefined) {
            return { tag: "head", selection: undefined };
          }
          return undefined;
        }
        return { tag: "content", index: lastIndex, selection: undefined };
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveUp(
          selection.selection,
          item,
          itemType.type
        ),
      };
    }
  }
};

const moveDown = (
  selection: ProductSelection,
  product: ProductValue,
  type: ProductType
): ProductSelection | undefined => {
  switch (selection.tag) {
    case "icon": {
      if (type.headItem !== undefined) {
        return { tag: "head", selection: undefined };
      }
      if (type.items.length >= 1) {
        return { tag: "content", index: 0, selection: undefined };
      }
      return undefined;
    }
    case "head": {
      if (
        product.headItem === undefined ||
        selection.selection === undefined ||
        type.headItem === undefined
      ) {
        if (product.items.length >= 1) {
          return { tag: "content", index: 0, selection: undefined };
        }
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveDown(
          selection,
          product.headItem.value,
          type.headItem.textType
        ),
      };
    }
    case "content": {
      const item = product.items[selection.index];
      const itemType = type.items[selection.index];
      if (
        item === undefined ||
        selection.selection === undefined ||
        itemType === undefined
      ) {
        const nextIndex = selection.index + 1;
        if (type.items.length <= nextIndex) {
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
        selection: commonElement.moveDown(
          selection.selection,
          item,
          itemType.type
        ),
      };
    }
  }
};

const moveFirstChild: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
>["moveFirstChild"] = (
  selection: ProductSelection | undefined,
  value: ProductValue,
  type: ProductType
): ProductSelection | undefined => {
  if (selection === undefined) {
    return firstChildValue(value, type);
  }
  switch (selection.tag) {
    case "icon": {
      if (type.headItem === undefined || !type.headItem.hasIcon) {
        return undefined;
      }
      return { tag: "icon" };
    }
    case "head": {
      if (value.headItem === undefined || type.headItem === undefined) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveFirstChild(
          selection.selection,
          value.headItem.value,
          type.headItem.textType
        ),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      const itemType = type.items[selection.index];
      if (item === undefined || itemType === undefined) {
        return undefined;
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveFirstChild(
          selection.selection,
          item,
          itemType.type
        ),
      };
    }
  }
};

const firstChildValue = (
  value: ProductValue,
  type: ProductType
): ProductSelection | undefined => {
  if (type.headItem !== undefined) {
    return { tag: "head", selection: undefined };
  }
  if (type.items.length !== 0) {
    return { tag: "content", index: 0, selection: undefined };
  }
  return undefined;
};

const moveParent: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
>["moveParent"] = (selection, value, type) => {
  switch (selection.tag) {
    case "icon": {
      return undefined;
    }
    case "head": {
      if (
        selection.selection === undefined ||
        value.headItem === undefined ||
        type.headItem === undefined
      ) {
        return undefined;
      }
      return {
        tag: "head",
        selection: textOperation.moveParent(
          selection,
          value.headItem.value,
          type.headItem.textType
        ),
      };
    }
    case "content": {
      const item = value.items[selection.index];
      const itemType = type.items[selection.index];
      if (
        selection.selection === undefined ||
        item === undefined ||
        itemType === undefined
      ) {
        return undefined;
      }
      return {
        tag: "content",
        index: selection.index,
        selection: commonElement.moveParent(
          selection.selection,
          item,
          itemType.type
        ),
      };
    }
  }
};

export const ProductSelectionView: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
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
      {props.value.headItem === undefined ||
      props.type.headItem === undefined ? (
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
            name={props.type.headItem.name}
            textType={props.type.headItem.textType}
            productSelection={props.selection}
            textValue={props.value.headItem.value}
            accountResource={props.accountResource}
            projectResource={props.projectResource}
            language={props.language}
            onJump={props.onJump}
            onRequestDataOperation={props.onRequestDataOperation}
          />
        </div>
      )}
      {props.type.items.map((itemType, index) => {
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
            type={itemType.type}
            itemSelection={getContentItemSelection(props.selection, index)}
            value={item}
            projectResource={props.projectResource}
            accountResource={props.accountResource}
            language={props.language}
            onJump={props.onJump}
            onRequestDataOperation={props.onRequestDataOperation}
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

const HeadItemView: React.VFC<
  Pick<
    UseDefinyAppResult,
    "accountResource" | "projectResource" | "language"
  > & {
    readonly onSelect: (selection: TextSelection | undefined) => void;
    readonly name: string;
    readonly textType: TextType;
    readonly textValue: TextValue;
    readonly productSelection: ProductSelection | undefined;
    readonly onJump: UseDefinyAppResult["jump"];
    readonly onRequestDataOperation: () => void;
  }
> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (
      props.productSelection !== undefined &&
      props.productSelection.tag === "head" &&
      ref.current !== null
    ) {
      ref.current.focus();
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
        type={props.textType}
        value={props.textValue}
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        selection={
          props.productSelection !== undefined &&
          props.productSelection.tag === "head"
            ? props.productSelection.selection
            : undefined
        }
        language={props.language}
        onJump={props.onJump}
        onChangeSelection={props.onSelect}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    </div>
  );
};

const ItemView: React.VFC<
  Pick<
    UseDefinyAppResult,
    "accountResource" | "projectResource" | "language"
  > & {
    readonly onSelect: (selection: Selection | undefined) => void;
    readonly name: string;
    readonly type: Type;
    readonly value: Value;
    readonly itemSelection: ItemSelection;
    readonly onJump: UseDefinyAppResult["jump"];
    readonly onRequestDataOperation: () => void;
  }
> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (props.itemSelection.tag === "selectSelf" && ref.current !== null) {
      ref.current.focus();
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
        type={props.type}
        value={props.value}
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        selection={
          props.itemSelection.tag === "selectInner"
            ? props.itemSelection.selection
            : undefined
        }
        language={props.language}
        onJump={props.onJump}
        onChangeSelection={props.onSelect}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    </div>
  );
};

const ProductDetailView: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
>["detailView"] = (props) => {
  if (props.selection === undefined) {
    return <div>product自体を選択している</div>;
  }
  switch (props.selection.tag) {
    case "head":
      if (
        props.value.headItem === undefined ||
        props.type.headItem === undefined
      ) {
        return <div>headItemがないのに選択している</div>;
      }
      return (
        <div>
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {props.type.headItem.name}
            </div>
          </div>
          <textOperation.detailView
            type={props.type.headItem.textType}
            value={props.value.headItem.value}
            selection={props.selection.selection}
            projectResource={props.projectResource}
            accountResource={props.accountResource}
            language={props.language}
            onJump={props.onJump}
            onRequestDataOperation={props.onRequestDataOperation}
          />
        </div>
      );
    case "icon":
      return <div>アイコンを選択してる</div>;
    case "content": {
      const item = props.value.items[props.selection.index];
      const itemType = props.type.items[props.selection.index];
      if (item === undefined || itemType === undefined) {
        return <div>指定した要素が存在しない</div>;
      }
      return (
        <div>
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {itemType.name}
            </div>
          </div>
          <commonElement.detailView
            type={itemType.type}
            value={item}
            selection={props.selection.selection}
            accountResource={props.accountResource}
            projectResource={props.projectResource}
            language={props.language}
            onJump={props.onJump}
            onRequestDataOperation={props.onRequestDataOperation}
          />
        </div>
      );
    }
  }
};

export const productOperation: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: ProductSelectionView,
  detailView: ProductDetailView,
};

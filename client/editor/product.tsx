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
import { Image } from "../container/Image";
import { css } from "@emotion/css";

export type ProductSelection =
  | {
      tag: "icon";
    }
  | {
      tag: "head";
      selection: Selection | undefined;
    }
  | {
      tag: "content";
      index: number;
      selection: Selection | undefined;
    };

export type ProductType = {
  headItem?: {
    name: string;
    type: Type;
    hasIcon: boolean;
  };
  items: ReadonlyArray<{ name: string; type: Type }>;
};

export type ProductValue = {
  headItem?: HeadItem;
  items: ReadonlyArray<Value>;
};

export type HeadItem = {
  value: Value;
  iconHash?: d.ImageHash;
};

const up = (
  selection: ProductSelection,
  product: ProductValue,
  type: ProductType
): SelectionUpdateResult<ProductSelection> => {
  switch (selection.tag) {
    case "icon":
      return { tag: "outside" };
    case "head": {
      // head の要素がないか, head自体を選択していた場合は外へ
      if (
        product.headItem === undefined ||
        selection.selection === undefined ||
        type.headItem === undefined
      ) {
        return { tag: "outside" };
      }
      const result = commonElement.up(
        selection.selection,
        product.headItem.value,
        type.headItem.type
      );
      return {
        tag: "inlineMove",
        selection: {
          tag: "head",
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
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
            return {
              tag: "inlineMove",
              selection: { tag: "head", selection: undefined },
            };
          }
          return { tag: "outside" };
        }
        return {
          tag: "inlineMove",
          selection: { tag: "content", index: lastIndex, selection: undefined },
        };
      }
      const result = commonElement.up(selection.selection, item, itemType.type);
      return {
        tag: "inlineMove",
        selection: {
          tag: "content",
          index: selection.index,
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
      };
    }
  }
};

const down = (
  selection: ProductSelection,
  product: ProductValue,
  type: ProductType
): SelectionUpdateResult<ProductSelection> => {
  switch (selection.tag) {
    case "icon": {
      if (type.headItem !== undefined) {
        return {
          tag: "inlineMove",
          selection: { tag: "head", selection: undefined },
        };
      }
      if (type.items.length >= 1) {
        return {
          tag: "inlineMove",
          selection: { tag: "content", index: 0, selection: undefined },
        };
      }
      return {
        tag: "outside",
      };
    }
    case "head": {
      if (
        product.headItem === undefined ||
        selection.selection === undefined ||
        type.headItem === undefined
      ) {
        if (product.items.length >= 1) {
          return {
            tag: "inlineMove",
            selection: { tag: "content", index: 0, selection: undefined },
          };
        }
        return {
          tag: "outside",
        };
      }
      const result = commonElement.down(
        selection.selection,
        product.headItem.value,
        type.headItem.type
      );
      return {
        tag: "inlineMove",
        selection: {
          tag: "head",
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
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
          return {
            tag: "outside",
          };
        }
        return {
          tag: "inlineMove",
          selection: {
            tag: "content",
            index: nextIndex,
            selection: undefined,
          },
        };
      }
      const result = commonElement.down(
        selection.selection,
        item,
        itemType.type
      );
      return {
        tag: "inlineMove",
        selection: {
          tag: "content",
          index: selection.index,
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
      };
    }
  }
};

const firstChild = (
  selection: ProductSelection,
  product: ProductValue,
  type: ProductType
): SelectionUpdateResult<ProductSelection> => {
  switch (selection.tag) {
    case "icon": {
      if (type.headItem === undefined || !type.headItem.hasIcon) {
        return {
          tag: "outside",
        };
      }
      return {
        tag: "inlineMove",
        selection: { tag: "icon" },
      };
    }
    case "head": {
      if (product.headItem === undefined || type.headItem === undefined) {
        return {
          tag: "outside",
        };
      }
      if (selection.selection === undefined) {
        return {
          tag: "inlineMove",
          selection: {
            tag: "head",
            selection: commonElement.firstChildValue(
              product.headItem.value,
              type.headItem.type
            ),
          },
        };
      }
      const result = commonElement.firstChild(
        selection.selection,
        product.headItem.value,
        type.headItem.type
      );
      return {
        tag: "inlineMove",
        selection: {
          tag: "head",
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
      };
    }
    case "content": {
      const item = product.items[selection.index];
      const itemType = type.items[selection.index];
      if (item === undefined || itemType === undefined) {
        return {
          tag: "outside",
        };
      }
      if (selection.selection === undefined) {
        return {
          tag: "inlineMove",
          selection: {
            tag: "content",
            index: selection.index,
            selection: commonElement.firstChildValue(item, itemType.type),
          },
        };
      }
      const result = commonElement.down(
        selection.selection,
        item,
        itemType.type
      );
      return {
        tag: "inlineMove",
        selection: {
          tag: "content",
          index: selection.index,
          selection: result.tag === "inlineMove" ? result.selection : undefined,
        },
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
          <ItemView
            onSelect={(selection) => {
              props.onChangeSelection({ tag: "head", selection });
            }}
            name={props.type.headItem.name}
            type={props.type.headItem.type}
            itemSelection={getHeadItemSelection(props.selection)}
            value={props.value.headItem.value}
            isHead
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
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
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
          />
        );
      })}
    </div>
  );
};

const getHeadItemSelection = (
  productSelection: ProductSelection | undefined
): ItemSelection => {
  if (productSelection === undefined || productSelection.tag !== "head") {
    return { tag: "none" };
  }
  if (productSelection.selection === undefined) {
    return { tag: "selectSelf" };
  }
  return { tag: "selectInner", selection: productSelection.selection };
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

const ItemView: React.VFC<{
  readonly onSelect: (selection: Selection | undefined) => void;
  readonly name: string;
  readonly type: Type;
  readonly value: Value;
  readonly itemSelection: ItemSelection;
  readonly isHead?: boolean;
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
        {props.isHead ? (
          <></>
        ) : (
          <div
            className={css({
              fontWeight: "bold",
              fontSize: 16,
              color: "#ddd",
            })}
          >
            {props.name}
          </div>
        )}
      </div>
      <commonElement.selectionView
        type={props.type}
        value={props.value}
        isBig={props.isHead}
        getAccount={props.getAccount}
        selection={
          props.itemSelection.tag === "selectInner"
            ? props.itemSelection.selection
            : undefined
        }
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
        onChangeSelection={props.onSelect}
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
          <commonElement.detailView
            type={props.type.headItem.type}
            value={props.value.headItem.value}
            selection={props.selection.selection}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
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
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
          />
        </div>
      );
    }
  }
};

export const productUpdate: ElementOperation<
  ProductSelection,
  ProductValue,
  ProductType
> = {
  up,
  down,
  firstChild,
  firstChildValue,
  selectionView: ProductSelectionView,
  detailView: ProductDetailView,
};

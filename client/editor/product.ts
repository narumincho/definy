import * as d from "../../data";
import {
  EditorElementSelectionUpdate,
  Selection,
  SelectionUpdateResult,
  Type,
  Value,
  selectionUpdate,
} from "./selectionAndValue";

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
      const result = selectionUpdate.up(
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
      const result = selectionUpdate.up(
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
      const result = selectionUpdate.down(
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
      const result = selectionUpdate.down(
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
            selection: selectionUpdate.firstChildValue(
              product.headItem.value,
              type.headItem.type
            ),
          },
        };
      }
      const result = selectionUpdate.firstChild(
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
            selection: selectionUpdate.firstChildValue(item, itemType.type),
          },
        };
      }
      const result = selectionUpdate.down(
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

export const productUpdate: EditorElementSelectionUpdate<
  ProductSelection,
  ProductValue,
  ProductType
> = {
  up,
  down,
  firstChild,
  firstChildValue,
};

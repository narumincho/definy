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

export type ProductValue = {
  headItem?: HeadItem;
  items: ReadonlyArray<Item>;
};

export type Item = {
  name: string;
  type: Type;
  value: Value;
};

export type HeadItem = {
  name: string;
  type: Type;
  value: Value;
  iconHash?: d.ImageHash;
};

const up = (
  selection: ProductSelection,
  product: ProductValue
): SelectionUpdateResult<ProductSelection> => {
  switch (selection.tag) {
    case "icon":
      return { tag: "outside" };
    case "head": {
      // head の要素がないか, head自体を選択していた場合は外へ
      if (product.headItem === undefined || selection.selection === undefined) {
        return { tag: "outside" };
      }
      const result = selectionUpdate.up(
        selection.selection,
        product.headItem.value
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
      // 要素が存在しない, 要素を自体を選択している場合
      if (item === undefined || selection.selection === undefined) {
        const lastIndex = Math.min(
          selection.index - 1,
          product.items.length - 1
        );
        if (lastIndex < 0) {
          if (product.headItem !== undefined) {
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
      const result = selectionUpdate.up(selection.selection, item.value);
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
  product: ProductValue
): SelectionUpdateResult<ProductSelection> => {
  switch (selection.tag) {
    case "icon": {
      if (product.headItem !== undefined) {
        return {
          tag: "inlineMove",
          selection: { tag: "head", selection: undefined },
        };
      }
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
    case "head": {
      if (product.headItem === undefined || selection.selection === undefined) {
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
        product.headItem.value
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
      if (item === undefined || selection.selection === undefined) {
        const nextIndex = selection.index + 1;
        if (product.items.length <= nextIndex) {
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
      const result = selectionUpdate.down(selection.selection, item.value);
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

export const productUpdate: EditorElementSelectionUpdate<
  ProductSelection,
  ProductValue
> = {
  up,
  down,
};

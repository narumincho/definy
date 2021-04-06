import * as d from "../../data";

export type Selection =
  | {
      tag: "none";
    }
  | {
      tag: "icon";
    }
  | {
      tag: "head";
    }
  | {
      tag: "content";
      index: number;
    };

export type Product = {
  headItem?: HeadItem;
  items: ReadonlyArray<Item>;
};

export type Item = {
  name: string;
  typeAndValue: TypeAndValue;
};

export type HeadItem = {
  name: string;
  typeAndValue: TypeAndValue;
  iconHash?: d.ImageHash;
};

export type TypeAndValue =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "select";
      valueList: ReadonlyArray<string>;
      index: number;
    }
  | {
      type: "image";
      alternativeText: string;
      value: d.ImageHash;
    }
  | {
      type: "account";
      value: d.AccountId;
    }
  | {
      type: "time";
      value: d.Time;
    }
  | {
      type: "listProject";
      value: ReadonlyArray<d.ProjectId>;
    };

export const selectionUp = (
  selection: Selection,
  product: Product
): Selection => {
  if (selection.tag === "content") {
    if (selection.index <= 0) {
      if (product.headItem === undefined) {
        return { tag: "content", index: 0 };
      }
      return { tag: "head" };
    }
    return { tag: "content", index: selection.index - 1 };
  }
  return selection;
};

export const selectionDown = (
  selection: Selection,
  product: Product
): Selection => {
  if (selection.tag === "head") {
    return { tag: "content", index: 0 };
  }
  if (selection.tag === "content") {
    return {
      tag: "content",
      index: Math.min(selection.index + 1, product.items.length - 1),
    };
  }
  return selection;
};

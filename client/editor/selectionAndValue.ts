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
  type: Type;
  value: Value;
};

export type HeadItem = {
  name: string;
  type: Type;
  value: Value;
  iconHash?: d.ImageHash;
};

export type Value =
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
      type: "project";
      value: d.ProjectId;
    }
  | {
      type: "list";
      value: ReadonlyArray<Value>;
    };

export type Type =
  | {
      tag: "text";
    }
  | {
      tag: "number";
    }
  | {
      tag: "select";
      valueList: ReadonlyArray<string>;
    }
  | {
      tag: "image";
    }
  | {
      tag: "account";
    }
  | {
      tag: "time";
    }
  | {
      tag: "project";
    }
  | {
      tag: "list";
      element: Type;
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

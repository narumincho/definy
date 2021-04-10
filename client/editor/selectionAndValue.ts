import * as d from "../../data";
import {
  HeadItem,
  ProductSelection,
  ProductType,
  ProductValue,
  productUpdate,
} from "./product";
import { ListSelection, ListType, ListValue, listUpdate } from "./list";

export type { ProductSelection, ProductValue, HeadItem, ProductType };

export type Selection =
  | {
      tag: "product";
      value: ProductSelection;
    }
  | {
      tag: "list";
      value: ListSelection;
    };

const selectionProduct = (value: ProductSelection): Selection => ({
  tag: "product",
  value,
});
const selectionList = (value: ListSelection): Selection => ({
  tag: "list",
  value,
});

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
      value: ListValue;
    }
  | {
      type: "product";
      value: ProductValue;
    };

const listValue = (value: ListValue): Value => ({ type: "list", value });
const productValue = (value: ProductValue): Value => ({
  type: "product",
  value,
});

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
      listType: ListType;
    }
  | {
      tag: "product";
      productType: ProductType;
    };

export type EditorElementSelectionUpdate<
  ElementSelection,
  ElementValue,
  ElementType
> = {
  up: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  down: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  firstChild: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  firstChildValue: (
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;
};

export type SelectionUpdateResult<ElementSelection> =
  | {
      tag: "inlineMove";
      selection: ElementSelection;
    }
  | {
      tag: "outside";
    };

const mapSelectionUpdateResult = <Input, Output>(
  result: SelectionUpdateResult<Input>,
  func: (input: Input) => Output
): SelectionUpdateResult<Output> => {
  switch (result.tag) {
    case "inlineMove":
      return {
        tag: "inlineMove",
        selection: func(result.selection),
      };
    case "outside":
      return {
        tag: "outside",
      };
  }
};

export const selectionUp = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.up(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

export const selectionDown = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.down(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

export const selectionFirstChild = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.firstChild(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

const up = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.up(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.up(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const down = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.down(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.down(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const firstChild = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.firstChild(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.firstChild(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const firstChildValue = (value: Value, type: Type): Selection | undefined => {
  if (value.type === "product" && type.tag === "product") {
    const productSelection = productUpdate.firstChildValue(
      value.value,
      type.productType
    );
    if (productSelection === undefined) {
      return undefined;
    }
    return {
      tag: "product",
      value: productSelection,
    };
  }
  if (value.type === "list" && type.tag === "list") {
    const listSelection = listUpdate.firstChildValue(
      value.value,
      type.listType
    );
    if (listSelection === undefined) {
      return undefined;
    }
    return {
      tag: "list",
      value: listSelection,
    };
  }
};

export const selectionUpdate: EditorElementSelectionUpdate<
  Selection,
  Value,
  Type
> = {
  up,
  down,
  firstChild,
  firstChildValue,
};

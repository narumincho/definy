import * as d from "../../data";
import {
  HeadItem,
  Item,
  ProductSelection,
  ProductValue,
  productUpdate,
} from "./product";
import { ListSelection, ListValue, listUpdate } from "./list";

export type { ProductSelection, ProductValue, HeadItem, Item };

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
      element: Type;
    };

export type EditorElementSelectionUpdate<ElementSelection, ElementValue> = {
  up: (
    elementSelection: ElementSelection,
    value: ElementValue
  ) => SelectionUpdateResult<ElementSelection>;
  down: (
    elementSelection: ElementSelection,
    value: ElementValue
  ) => SelectionUpdateResult<ElementSelection>;
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
  product: ProductValue
): ProductSelection => {
  const result = productUpdate.up(selection, product);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

export const selectionDown = (
  selection: ProductSelection,
  product: ProductValue
): ProductSelection => {
  const result = productUpdate.down(selection, product);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

const up = (
  selection: Selection,
  value: Value
): SelectionUpdateResult<Selection> => {
  if (selection.tag === "list" && value.type === "list") {
    return mapSelectionUpdateResult(
      listUpdate.up(selection.value, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return mapSelectionUpdateResult(
      productUpdate.up(selection.value, value.value),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const down = (
  selection: Selection,
  value: Value
): SelectionUpdateResult<Selection> => {
  if (selection.tag === "list" && value.type === "list") {
    return mapSelectionUpdateResult(
      listUpdate.down(selection.value, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return mapSelectionUpdateResult(
      productUpdate.down(selection.value, value.value),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

export const selectionUpdate: EditorElementSelectionUpdate<Selection, Value> = {
  up,
  down,
};

import {
  EditorElementSelectionUpdate,
  Selection,
  SelectionUpdateResult,
  Type,
  Value,
  selectionUpdate,
} from "./selectionAndValue";

export type ListSelection = {
  readonly index: number;
  readonly selection: Selection | undefined;
};

export type ListType = {
  elementType: Type;
};

export type ListValue = {
  readonly items: ReadonlyArray<Value>;
};

const up = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = Math.min(selection.index - 1, value.items.length - 1);
    if (nextIndex < 0) {
      return { tag: "outside" };
    }
    return {
      tag: "inlineMove",
      selection: { index: nextIndex, selection: undefined },
    };
  }
  const result = selectionUpdate.up(
    selection.selection,
    item,
    type.elementType
  );
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const down = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (selection.selection === undefined || item === undefined) {
    const nextIndex = selection.index + 1;
    if (value.items.length - 1 < nextIndex) {
      return { tag: "outside" };
    }
    return {
      tag: "inlineMove",
      selection: { index: nextIndex, selection: undefined },
    };
  }
  const result = selectionUpdate.up(
    selection.selection,
    item,
    type.elementType
  );
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const firstChild = (
  selection: ListSelection,
  value: ListValue,
  type: ListType
): SelectionUpdateResult<ListSelection> => {
  const item = value.items[selection.index];
  if (item === undefined) {
    return {
      tag: "outside",
    };
  }
  if (selection.selection === undefined) {
    return {
      tag: "inlineMove",
      selection: {
        index: selection.index,
        selection: selectionUpdate.firstChildValue(item, type.elementType),
      },
    };
  }
  const result = selectionUpdate.down(
    selection.selection,
    item,
    type.elementType
  );
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

const firstChildValue = (
  value: ListValue,
  type: ListType
): ListSelection | undefined => {
  if (value.items.length > 0) {
    return {
      index: 0,
      selection: undefined,
    };
  }
};

export const listUpdate: EditorElementSelectionUpdate<
  ListSelection,
  ListValue,
  ListType
> = {
  up,
  down,
  firstChild,
  firstChildValue,
};

import {
  EditorElementSelectionUpdate,
  Selection,
  SelectionUpdateResult,
  Value,
  selectionUpdate,
} from "./selectionAndValue";

export type ListSelection = {
  readonly index: number;
  readonly selection: Selection | undefined;
};

export type ListValue = {
  readonly items: ReadonlyArray<Value>;
};

const up = (
  selection: ListSelection,
  value: ListValue
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
  const result = selectionUpdate.up(selection.selection, item);
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
  value: ListValue
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
  const result = selectionUpdate.up(selection.selection, item);
  return {
    tag: "inlineMove",
    selection: {
      index: selection.index,
      selection: result.tag === "inlineMove" ? result.selection : undefined,
    },
  };
};

export const listUpdate: EditorElementSelectionUpdate<
  ListSelection,
  ListValue
> = {
  up,
  down,
};

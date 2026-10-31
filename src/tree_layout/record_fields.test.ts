import { describe, expect, it } from "vitest";
import {
  applyRecordAction,
  recordExpressionFor,
  recordFieldNamesOfType,
  recordFieldSelectorOptions,
  renameRecordKeyAt,
  RECORD_APPEND_FIELD,
  RECORD_DELETE_FIELD,
  RECORD_MOVE_LATER,
} from "./record_fields.ts";
import { hole } from "./expression.ts";
import { variant } from "../definy_value.ts";
import { isVariableNamePath, renameVariableAt } from "./local_variable.ts";
import { applySelection } from "./selection.ts";

const number = (value: number): unknown => variant("number", value);
const record = (fields: ReadonlyArray<[string, unknown]>): unknown =>
  variant(
    "record",
    fields.map(([key, value]) => ({ key, value })),
  );

describe("record field actions", () => {
  const expr = record([
    ["a", number(1)],
    ["b", number(2)],
  ]);

  it("lists add-field on the record and field actions on a field", () => {
    expect(
      recordFieldSelectorOptions(expr, []).map((option) => option.value),
    ).toEqual([RECORD_APPEND_FIELD]);
    expect(
      recordFieldSelectorOptions(expr, [
        { kind: "recordItemValue", index: 0 },
      ]).map((option) => option.name),
    ).toEqual([
      "insert-field-before",
      "insert-field-after",
      "move-field-later",
      "delete-field",
    ]);
  });

  it("appends a field with an unused name and selects its name", () => {
    const result = applyRecordAction(
      record([["field", number(1)]]),
      [],
      RECORD_APPEND_FIELD,
    );
    expect(result?.expression).toEqual(
      record([
        ["field", number(1)],
        ["field1", hole()],
      ]),
    );
    expect(result?.selectedPath).toEqual([{ kind: "recordItemKey", index: 1 }]);
  });

  it("adds number-typed fields to record types", () => {
    const result = applyRecordAction(
      variant("type_record", []),
      [],
      RECORD_APPEND_FIELD,
    );
    expect(result?.expression).toEqual(
      variant("type_record", [{ key: "field", value: variant("type_number") }]),
    );
  });

  it("moves and deletes fields", () => {
    expect(
      applyRecordAction(
        expr,
        [{ kind: "recordItemValue", index: 0 }],
        RECORD_MOVE_LATER,
      )?.expression,
    ).toEqual(
      record([
        ["b", number(2)],
        ["a", number(1)],
      ]),
    );
    const deleted = applyRecordAction(
      expr,
      [{ kind: "recordItemKey", index: 1 }],
      RECORD_DELETE_FIELD,
    );
    expect(deleted?.expression).toEqual(record([["a", number(1)]]));
    expect(deleted?.selectedPath).toEqual([
      { kind: "recordItemValue", index: 0 },
    ]);
  });
});

describe("renaming record keys", () => {
  it("renames the key of a field and of a record_get as names", () => {
    const keyPath = [{ kind: "recordItemKey" as const, index: 1 }];
    expect(isVariableNamePath(keyPath)).toBe(true);
    expect(
      renameVariableAt(
        record([
          ["a", number(1)],
          ["b", number(2)],
        ]),
        keyPath,
        "c",
      ),
    ).toEqual(
      record([
        ["a", number(1)],
        ["c", number(2)],
      ]),
    );
    const get = variant("record_get", { record: hole(), key: "key" });
    expect(isVariableNamePath(["recordGetKey"])).toBe(true);
    expect(renameRecordKeyAt(get, ["recordGetKey"], "x")).toEqual(
      variant("record_get", { record: hole(), key: "x" }),
    );
  });
});

describe("record selections", () => {
  it("makes a record with the fields of the expected record type", () => {
    const expected = variant("record", [
      { key: "x", field_type: variant("number") },
      { key: "y", field_type: variant("number") },
    ]);
    expect(recordExpressionFor(expected)).toEqual(
      record([
        ["x", hole()],
        ["y", hole()],
      ]),
    );
    expect(recordExpressionFor(null)).toEqual(record([]));
  });

  it("makes record_get from the get-field and variable field options", () => {
    expect(applySelection(hole(), [], "expr:record_get")).toEqual(
      variant("record_get", { record: hole(), key: "key" }),
    );
    expect(applySelection(hole(), [], "ref:field:3:x")).toEqual(
      variant("record_get", {
        record: variant("variable", { variable_id: 3 }),
        key: "x",
      }),
    );
  });

  it("finds the field names through type part references", () => {
    const declaration = variant("type_record", [
      { key: "x", value: variant("type_number") },
    ]);
    const reference = variant("part_reference", {
      part_definition_event_hash: "point",
    });
    expect(
      recordFieldNamesOfType(reference, (id) =>
        id === "point" ? declaration : undefined,
      ),
    ).toEqual(["x"]);
    expect(
      recordFieldNamesOfType(variant("type_number"), () => undefined),
    ).toBeUndefined();
  });
});

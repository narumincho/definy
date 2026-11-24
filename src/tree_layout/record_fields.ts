/**
 * レコード (`record` の式と `type_record` の型) のフィールドの追加・削除・並び替え・名前の変更と,
 * フィールドの取り出し (`record_get`) のフィールド名の変更 (docs/ui.md「式エディタの操作」).
 * フィールドを選んだとき (またはレコードそのものを選んだとき) の置換メニューに操作の選択肢を出す
 */
import type { SelectorOption } from "./selector_options.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import type { PathStep } from "./types.ts";
import { field, variant, variantOf, variantPayload } from "../definy_value.ts";
import { hole } from "./expression.ts";

/** 置換メニューの選択肢の value */
export const RECORD_APPEND_FIELD = "record:append";
const RECORD_INSERT_BEFORE = "record:insert-before";
const RECORD_INSERT_AFTER = "record:insert-after";
const RECORD_MOVE_EARLIER = "record:move-earlier";
export const RECORD_MOVE_LATER = "record:move-later";
export const RECORD_DELETE_FIELD = "record:delete";

type RecordField = { readonly key: string; readonly value: unknown };

/** レコードの式・型のタグとフィールド. レコードでなければ `null` */
function recordAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): {
  readonly tag: "record" | "type_record";
  readonly fields: ReadonlyArray<RecordField>;
} | null {
  const tagged = variantOf(getExpressionAtPath(expr, path));
  if (
    tagged === undefined ||
    (tagged.tag !== "record" && tagged.tag !== "type_record")
  ) {
    return null;
  }
  const items: ReadonlyArray<unknown> = Array.isArray(tagged.payload)
    ? tagged.payload
    : [];
  return {
    tag: tagged.tag,
    fields: items.map((item) => ({
      key: String(field(item, "key") ?? ""),
      value: field(item, "value"),
    })),
  };
}

/** `path` の最後がレコードのフィールドの値か名前で, その親がレコードなら, フィールドの番号と数 */
function recordFieldAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): { readonly index: number; readonly length: number } | null {
  const last = path[path.length - 1];
  if (
    typeof last !== "object" ||
    (last.kind !== "recordItemValue" && last.kind !== "recordItemKey")
  ) {
    return null;
  }
  const record = recordAt(expr, path.slice(0, -1));
  return record === null || last.index >= record.fields.length
    ? null
    : { index: last.index, length: record.fields.length };
}

/** `path` の最後がレコードのフィールドの名前 ({@link PathStep} の `recordItemKey`) なら, その番号 */
export function recordItemKeyIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === "recordItemKey"
    ? last.index
    : null;
}

/** `path` の最後がフィールドの取り出しのフィールド名 (`recordGetKey`) か */
export function isRecordGetKeyPath(path: ReadonlyArray<PathStep>): boolean {
  return path[path.length - 1] === "recordGetKey";
}

/** レコードのフィールド名・フィールドの取り出しのフィールド名 (`path`) を変える. 名前でなければ式をそのまま返す */
export function renameRecordKeyAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const parentPath = path.slice(0, -1);
  if (isRecordGetKeyPath(path)) {
    return updateExpressionAtPath(expr, parentPath, (target) => {
      const payload = variantPayload(target, "record_get");
      return payload === undefined
        ? target
        : variant("record_get", { ...(payload as object), key: name });
    });
  }
  const index = recordItemKeyIndex(path);
  if (index === null) {
    return expr;
  }
  return updateRecordAt(expr, parentPath, (fields) =>
    fields.map((f, i) => (i === index ? { ...f, key: name } : f)),
  );
}

function updateRecordAt(
  expr: unknown,
  recordPath: ReadonlyArray<PathStep>,
  updater: (fields: ReadonlyArray<RecordField>) => ReadonlyArray<RecordField>,
): unknown {
  const record = recordAt(expr, recordPath);
  if (record === null) {
    return expr;
  }
  return updateExpressionAtPath(expr, recordPath, () =>
    variant(record.tag, updater(record.fields)),
  );
}

/** 他のフィールドと重ならない新しいフィールド名 (`field`, `field1`, ...) */
function newFieldName(fields: ReadonlyArray<RecordField>): string {
  const used = new Set(fields.map((f) => f.key));
  if (!used.has("field")) {
    return "field";
  }
  let n = 1;
  while (used.has(`field${n}`)) {
    n += 1;
  }
  return `field${n}`;
}

/** 新しいフィールドの値. レコードの式なら未入力, レコードの型なら `number` */
function newFieldValue(tag: "record" | "type_record"): unknown {
  return tag === "record" ? hole() : variant("type_number");
}

const action = (
  value: string,
  name: string,
  detail?: string,
): SelectorOption => ({
  value,
  name,
  detail,
  category: "Record",
  returnType: "any",
});

/**
 * レコードの操作の選択肢. レコードそのものなら末尾にフィールドを足す,
 * フィールド (値・名前) なら前後にフィールドを足す・前後へ動かす・消す
 */
export function recordFieldSelectorOptions(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  const item = recordFieldAt(expr, path);
  const own = recordAt(expr, path);
  return [
    ...(own !== null
      ? [action(RECORD_APPEND_FIELD, "add-field", "{ ..., field: □ }")]
      : []),
    ...(item === null
      ? []
      : [
          action(RECORD_INSERT_BEFORE, "insert-field-before"),
          action(RECORD_INSERT_AFTER, "insert-field-after"),
          ...(item.index > 0
            ? [action(RECORD_MOVE_EARLIER, "move-field-earlier", "↑")]
            : []),
          ...(item.index < item.length - 1
            ? [action(RECORD_MOVE_LATER, "move-field-later", "↓")]
            : []),
          action(RECORD_DELETE_FIELD, "delete-field"),
        ]),
  ];
}

export function isRecordAction(value: string): boolean {
  return value.startsWith("record:");
}

/**
 * レコードの操作 ({@link recordFieldSelectorOptions}) を適用する.
 * 操作した後に選ぶ位置 (足したフィールドの名前・動かしたフィールド・消したフィールドの隣かレコード) も返す.
 * 適用できなければ `null`
 */
export function applyRecordAction(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): {
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep>;
} | null {
  const keyPath = (recordPath: ReadonlyArray<PathStep>, index: number) => [
    ...recordPath,
    { kind: "recordItemKey" as const, index },
  ];
  const valuePath = (recordPath: ReadonlyArray<PathStep>, index: number) => [
    ...recordPath,
    { kind: "recordItemValue" as const, index },
  ];
  if (value === RECORD_APPEND_FIELD) {
    const record = recordAt(expr, path);
    if (record === null) {
      return null;
    }
    return {
      expression: updateRecordAt(expr, path, (fields) => [
        ...fields,
        { key: newFieldName(fields), value: newFieldValue(record.tag) },
      ]),
      selectedPath: keyPath(path, record.fields.length),
    };
  }
  const item = recordFieldAt(expr, path);
  const recordPath = path.slice(0, -1);
  const record = recordAt(expr, recordPath);
  if (item === null || record === null) {
    return null;
  }
  const { index, length } = item;
  const insertAt = (at: number) => ({
    expression: updateRecordAt(expr, recordPath, (fields) => [
      ...fields.slice(0, at),
      { key: newFieldName(fields), value: newFieldValue(record.tag) },
      ...fields.slice(at),
    ]),
    selectedPath: keyPath(recordPath, at),
  });
  switch (value) {
    case RECORD_INSERT_BEFORE:
      return insertAt(index);
    case RECORD_INSERT_AFTER:
      return insertAt(index + 1);
    case RECORD_MOVE_EARLIER:
    case RECORD_MOVE_LATER: {
      const to = value === RECORD_MOVE_EARLIER ? index - 1 : index + 1;
      if (to < 0 || to >= length) {
        return null;
      }
      return {
        expression: updateRecordAt(expr, recordPath, (fields) =>
          fields.map((current, i) =>
            i === index
              ? (fields[to] ?? current)
              : i === to
                ? (fields[index] ?? current)
                : current,
          ),
        ),
        selectedPath: valuePath(recordPath, to),
      };
    }
    case RECORD_DELETE_FIELD:
      return {
        expression: updateRecordAt(expr, recordPath, (fields) =>
          fields.filter((_, i) => i !== index),
        ),
        selectedPath:
          length === 1
            ? recordPath
            : valuePath(recordPath, Math.min(index, length - 2)),
      };
    default:
      return null;
  }
}

/**
 * 期待する型 (`core.type-ast` の値) がレコードなら, そのフィールドを未入力にしたレコードの式.
 * レコードでなければフィールドの無いレコード
 */
export function recordExpressionFor(expectedType: unknown): unknown {
  const fields = variantPayload(expectedType, "record");
  return variant(
    "record",
    Array.isArray(fields)
      ? fields.map((f) => ({
          key: String(field(f, "key") ?? ""),
          value: hole(),
        }))
      : [],
  );
}

/** フィールドの取り出しの式 (`record.key`) */
export function recordGetExpression(record: unknown, key: string): unknown {
  return variant("record_get", { record, key });
}

/**
 * 型の式 (パーツの型の書き方) がレコードなら, そのフィールド名. 型パーツの参照はその宣言をたどる
 * (`A = B` のような参照の循環は 16 段で諦める). レコードでなければ `undefined`
 */
export function recordFieldNamesOfType(
  type: unknown,
  declarationOf: (partIdHash: string) => unknown,
): ReadonlyArray<string> | undefined {
  let current = type;
  for (let depth = 0; depth < 16; depth += 1) {
    const fields = variantPayload(current, "type_record");
    if (Array.isArray(fields)) {
      return fields.map((f) => String(field(f, "key") ?? ""));
    }
    const reference = field(
      variantPayload(current, "part_reference"),
      "part_definition_event_hash",
    );
    if (typeof reference !== "string") {
      return undefined;
    }
    current = declarationOf(reference);
  }
  return undefined;
}

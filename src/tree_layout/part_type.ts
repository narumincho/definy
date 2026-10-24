/**
 * パーツの型 (`partType`, `core.type-ast` の値) と, 型のツリーエディタで扱う型の式の相互変換.
 *
 * 型の行は式のツリーエディタ (ExpressionTreeEditor の mode="type") をそのまま使うので,
 * 型を型パーツの宣言と同じ型の式 (`core.expression` の `type_number`, `type_list` ...) にして編集し, 保存のときに戻す.
 * 型パーツの宣言に無い `type` (型そのもの) と `Code<T>` はエディタの中だけの `type_type` / `type_code` にする.
 *
 * | partType (`core.type-ast`)                     | 型の式                                                     |
 * | ---------------------------------------------- | ---------------------------------------------------------- |
 * | `number` / `string` / `boolean` / `secret`     | `type_number` / `type_string` / `type_boolean` / `type_secret` |
 * | `type`                                         | `type_type`                                                |
 * | `list({ item_type })`                          | `type_list({ item_type })`                                 |
 * | `code(T)`                                      | `type_code({ value_type: T })`                             |
 * | `function({ parameters: [{ name, type }], return_type })` | `type_function({ parameters: [{ name, type }], return_type })` |
 * | `record([{ key, field_type }])`                | `type_record([{ key, value }])`                            |
 * | `union([{ tag, payload_type }])`               | `type_union([{ tag, payload_type }])`                      |
 * | `reference({ part_hash })`                     | `part_reference({ part_definition_event_hash })`           |
 * | `builtin(name)` (組み込みの関数の型)            | `builtin(name)`                                            |
 * | `null` (型指定なし)                            | `null`                                                     |
 *
 * 未入力 (`hole`) は `null` に戻す. 知らない形はそのまま `unknown_part_type(値)` で包んで往復させる
 */
import {
  field,
  none,
  optionValue,
  some,
  variant,
  variantOf,
  variantPayload,
} from "../definy_value.ts";

const SIMPLE_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["number", "type_number"],
  ["string", "type_string"],
  ["boolean", "type_boolean"],
  ["type", "type_type"],
  ["secret", "type_secret"],
];

function arrayOf(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function mapOption(
  value: unknown,
  convert: (inner: unknown) => unknown,
): unknown {
  const inner = optionValue(value);
  return inner === undefined ? none() : some(convert(inner));
}

export function partTypeToExpression(partType: unknown): unknown {
  if (partType === null || partType === undefined) {
    return null;
  }
  const tagged = variantOf(partType);
  if (tagged === undefined) {
    return variant("unknown_part_type", partType);
  }
  const { tag, payload } = tagged;
  const simple = SIMPLE_TYPES.find(([t]) => t === tag);
  if (simple !== undefined) {
    return variant(simple[1]);
  }
  switch (tag) {
    case "list":
      return variant("type_list", {
        item_type: partTypeToExpression(field(payload, "item_type")),
      });
    case "code":
      return variant("type_code", {
        value_type: partTypeToExpression(payload),
      });
    case "function":
      return variant("type_function", {
        parameters: arrayOf(field(payload, "parameters")).map((p) => ({
          name: String(field(p, "name") ?? ""),
          type: partTypeToExpression(field(p, "type")),
        })),
        return_type: partTypeToExpression(field(payload, "return_type")),
      });
    case "record":
      return variant(
        "type_record",
        arrayOf(payload).map((f) => ({
          key: String(field(f, "key") ?? ""),
          value: partTypeToExpression(field(f, "field_type")),
        })),
      );
    case "union":
      return variant(
        "type_union",
        arrayOf(payload).map((v) => ({
          tag: String(field(v, "tag") ?? ""),
          payload_type: mapOption(
            field(v, "payload_type"),
            partTypeToExpression,
          ),
        })),
      );
    case "reference":
      return variant("part_reference", {
        part_definition_event_hash: field(payload, "part_hash"),
      });
    case "builtin":
      return variant("builtin", payload);
  }
  return variant("unknown_part_type", partType);
}

export function expressionToPartType(expression: unknown): unknown {
  const tagged = variantOf(expression);
  if (tagged === undefined || tagged.tag === "hole") {
    return null;
  }
  const { tag, payload } = tagged;
  const simple = SIMPLE_TYPES.find(([, e]) => e === tag);
  if (simple !== undefined) {
    return variant(simple[0]);
  }
  switch (tag) {
    case "unknown_part_type":
      return payload;
    case "type_list":
      return variant("list", {
        item_type: expressionToPartType(field(payload, "item_type")),
      });
    case "type_code":
      return variant(
        "code",
        expressionToPartType(field(payload, "value_type")),
      );
    case "type_function":
      return variant("function", {
        parameters: arrayOf(field(payload, "parameters")).map((p) => ({
          name: String(field(p, "name") ?? ""),
          type: expressionToPartType(field(p, "type")),
        })),
        return_type: expressionToPartType(field(payload, "return_type")),
      });
    case "type_record":
      return variant(
        "record",
        arrayOf(payload).map((f) => ({
          key: String(field(f, "key") ?? ""),
          field_type: expressionToPartType(field(f, "value")),
        })),
      );
    case "type_union":
      return variant(
        "union",
        arrayOf(payload).map((v) => ({
          tag: String(field(v, "tag") ?? ""),
          payload_type: mapOption(
            field(v, "payload_type"),
            expressionToPartType,
          ),
        })),
      );
    case "part_reference":
      return variant("reference", {
        part_hash: field(payload, "part_definition_event_hash"),
      });
    case "builtin":
      return variant("builtin", payload);
  }
  return null;
}

/** 式の根が関数なら, その引数名の一覧 */
function rootParameterNames(
  expression: unknown,
): ReadonlyArray<unknown> | null {
  const parameters = field(
    variantPayload(expression, "function"),
    "parameters",
  );
  return Array.isArray(parameters)
    ? parameters.map((parameter) => field(parameter, "parameter_name"))
    : null;
}

/**
 * 式の根の関数の引数名が `before` から `after` で変わったら, 関数のパーツの型の同じ位置の引数名も変えた型を返す.
 * 呼び出し側は引数をパーツの型の引数名で渡すので, 型の引数名と式の引数名を揃えておく.
 * 変わっていなければ `undefined`
 */
export function syncPartTypeParameterNames(
  partType: unknown,
  before: unknown,
  after: unknown,
): unknown {
  const beforeNames = rootParameterNames(before);
  const afterNames = rootParameterNames(after);
  const fn = variantPayload(partType, "function") as
    | {
        readonly parameters?: ReadonlyArray<Readonly<Record<string, unknown>>>;
      }
    | undefined;
  if (
    beforeNames === null ||
    afterNames === null ||
    fn?.parameters === undefined ||
    beforeNames.length !== afterNames.length ||
    beforeNames.every((name, i) => name === afterNames[i])
  ) {
    return undefined;
  }
  return variant("function", {
    ...fn,
    parameters: fn.parameters.map((parameter, i) =>
      beforeNames[i] !== afterNames[i] && typeof afterNames[i] === "string"
        ? { ...parameter, name: afterNames[i] }
        : parameter,
    ),
  });
}

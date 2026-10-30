/**
 * 型チェッカーの形 (`core.type-ast`) と型の式 (`core.expression` の `type_number`, `type_list` ...) の相互変換
 * (docs/type-expression.md).
 *
 * パーツの型は seed・CAS・TypeScript の中 (`partType`) のどこでも型の式で持ち, 型チェッカーにもそのまま渡す.
 * `core.type-ast` は型チェッカーが比べるための形で, 型チェッカーが返す型 (期待する型・推論した型・型エラーの型) だけがこの形.
 * それを型のツリーで表示するとき (`typeAstToExpression`) と, 型パーツの宣言をたどって型チェッカーの返した型と
 * 比べるとき (`expressionToTypeAst`, `core.type-expression-to-type-ast` と同じ変換) に使う.
 *
 * | `core.type-ast`                                                    | 型の式                                                     |
 * | ---------------------------------------------- | ---------------------------------------------------------- |
 * | `number` / `string` / `boolean` / `secret`     | `type_number` / `type_string` / `type_boolean` / `type_secret` |
 * | `type`                                         | `type_type`                                                |
 * | `list({ item_type })`                          | `type_list({ item_type })`                                 |
 * | `code(T)`                                      | `type_code({ value_type: T })`                             |
 * | `function({ parameters: [{ name, type }], return_type })` | `type_function({ parameters: [{ name, type }], return_type })` |
 * | `record([{ key, field_type }])`                | `type_record([{ key, value }])`                            |
 * | `union([{ tag, payload_type }])`               | `type_union([{ tag, payload_type }])`                      |
 * | `reference({ part_hash })`                     | `part_reference({ part_definition_event_hash })`           |
 * | `parameter(name)` (型引数)                      | `type_parameter(name)`                                     |
 * | `apply({ part_hash, arguments: [{ name, type }] })` | `call({ function: part_reference, arguments: [{ name, value }] })` |
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
} from "./definy_value.ts";

const SIMPLE_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["number", "type_number"],
  ["float", "type_float"],
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

export function typeAstToExpression(partType: unknown): unknown {
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
        item_type: typeAstToExpression(field(payload, "item_type")),
      });
    case "code":
      return variant("type_code", {
        value_type: typeAstToExpression(payload),
      });
    case "function":
      return variant("type_function", {
        parameters: arrayOf(field(payload, "parameters")).map((p) => ({
          name: String(field(p, "name") ?? ""),
          type: typeAstToExpression(field(p, "type")),
        })),
        return_type: typeAstToExpression(field(payload, "return_type")),
      });
    case "record":
      return variant(
        "type_record",
        arrayOf(payload).map((f) => ({
          key: String(field(f, "key") ?? ""),
          value: typeAstToExpression(field(f, "field_type")),
        })),
      );
    case "union":
      return variant(
        "type_union",
        arrayOf(payload).map((v) => ({
          tag: String(field(v, "tag") ?? ""),
          payload_type: mapOption(
            field(v, "payload_type"),
            typeAstToExpression,
          ),
        })),
      );
    case "reference":
      return variant("part_reference", {
        part_definition_event_hash: field(payload, "part_hash"),
      });
    case "parameter":
      return variant("type_parameter", payload);
    case "apply":
      return variant("call", {
        function: variant("part_reference", {
          part_definition_event_hash: field(payload, "part_hash"),
        }),
        arguments: arrayOf(field(payload, "arguments")).map((a) => ({
          name: String(field(a, "name") ?? ""),
          value: typeAstToExpression(field(a, "type")),
        })),
      });
    case "builtin":
      return variant("builtin", payload);
  }
  return variant("unknown_part_type", partType);
}

export function expressionToTypeAst(expression: unknown): unknown {
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
        item_type: expressionToTypeAst(field(payload, "item_type")),
      });
    case "type_code":
      return variant("code", expressionToTypeAst(field(payload, "value_type")));
    case "type_function":
      return variant("function", {
        parameters: arrayOf(field(payload, "parameters")).map((p) => ({
          name: String(field(p, "name") ?? ""),
          type: expressionToTypeAst(field(p, "type")),
        })),
        return_type: expressionToTypeAst(field(payload, "return_type")),
      });
    case "type_record":
      return variant(
        "record",
        arrayOf(payload).map((f) => ({
          key: String(field(f, "key") ?? ""),
          field_type: expressionToTypeAst(field(f, "value")),
        })),
      );
    case "type_union":
      return variant(
        "union",
        arrayOf(payload).map((v) => ({
          tag: String(field(v, "tag") ?? ""),
          payload_type: mapOption(
            field(v, "payload_type"),
            expressionToTypeAst,
          ),
        })),
      );
    case "part_reference":
      return variant("reference", {
        part_hash: field(payload, "part_definition_event_hash"),
      });
    case "type_parameter":
      return variant("parameter", payload);
    case "call": {
      const callee = variantPayload(
        field(payload, "function"),
        "part_reference",
      );
      if (callee === undefined) {
        return null;
      }
      return variant("apply", {
        part_hash: field(callee, "part_definition_event_hash"),
        arguments: arrayOf(field(payload, "arguments")).map((a) => ({
          name: String(field(a, "name") ?? ""),
          type: expressionToTypeAst(field(a, "value")),
        })),
      });
    }
    case "builtin":
      return variant("builtin", payload);
  }
  return null;
}

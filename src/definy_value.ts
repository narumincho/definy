/**
 * definy の値 (数値・文字列・真偽値・リスト・レコード・タグ付きの値) の JSON / CBOR での表し方
 * (docs/value-encoding.md).
 *
 * パーツの式 (`core.expression` の値) と宣言型 (`core.type-ast` の値) はこの形のまま保存し,
 * stage1 や型チェッカーにもそのまま渡す. TypeScript 側は式の構造を別の形に変換しない.
 *
 * - 数値・文字列・真偽値: JSON / CBOR の整数・文字列・真偽値
 * - リスト: 配列
 * - レコード: キーが `#` で始まらないオブジェクト (CBOR の map)
 * - タグ付きの値 (Variant): キーが `#タグ` の 1 つだけのオブジェクト. 値はペイロード (無ければ `null`)
 */

export type DefinyData =
  | number
  | string
  | boolean
  | ReadonlyArray<DefinyData>
  | { readonly [key: string]: DefinyData | null };

/** タグ付きの値のキーの先頭の文字 */
export const VARIANT_PREFIX = "#";

/** タグ付きの値 `{"#tag": payload}` を作る */
export function variant(tag: string, payload: unknown = null): unknown {
  return { [VARIANT_PREFIX + tag]: payload };
}

/** タグ付きの値ならタグとペイロード (無ければ `null`), そうでなければ `undefined` */
export function variantOf(
  value: unknown,
): { readonly tag: string; readonly payload: unknown } | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Uint8Array
  ) {
    return undefined;
  }
  const keys = Object.keys(value);
  const key = keys[0];
  if (keys.length !== 1 || key === undefined || !key.startsWith("#")) {
    return undefined;
  }
  return {
    tag: key.slice(VARIANT_PREFIX.length),
    payload: (value as Readonly<Record<string, unknown>>)[key] ?? null,
  };
}

/** タグが `tag` のタグ付きの値か */
export function isVariant(value: unknown, tag: string): boolean {
  return variantOf(value)?.tag === tag;
}

/** タグが `tag` のタグ付きの値ならそのペイロード, そうでなければ `undefined` */
export function variantPayload(value: unknown, tag: string): unknown {
  const v = variantOf(value);
  return v?.tag === tag ? v.payload : undefined;
}

/** レコード (タグ付きの値・リストでないオブジェクト) か */
export function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array) &&
    variantOf(value) === undefined
  );
}

/** レコードのフィールド. レコードでないか無ければ `undefined` */
export function field(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

/** `none` / `some(x)` の値 (`core` の option の形) */
export function none(): unknown {
  return variant("none");
}

export function some(value: unknown): unknown {
  return variant("some", value);
}

/** `some(x)` なら `x`, `none` などそれ以外なら `undefined` */
export function optionValue(value: unknown): unknown {
  return variantPayload(value, "some") ?? undefined;
}

/**
 * 値 `value` に評価される式 (`core.expression` の値) を作る. 数値は `number`, リストは `list`, レコードは `record`,
 * タグ付きの値は `variant` の式になる. 値を式の中に書き込んで definy の関数に渡すときに使う
 */
export function literalExpression(value: unknown): unknown {
  if (typeof value === "number") {
    return variant("number", value);
  }
  if (typeof value === "string") {
    return variant("string", value);
  }
  if (typeof value === "boolean") {
    return variant("boolean", value);
  }
  if (Array.isArray(value)) {
    return variant("list", value.map(literalExpression));
  }
  const tagged = variantOf(value);
  if (tagged !== undefined) {
    return variant("variant", {
      tag: tagged.tag,
      payload:
        tagged.payload === null
          ? none()
          : some(literalExpression(tagged.payload)),
      type_part: none(),
    });
  }
  if (isRecord(value)) {
    return variant(
      "record",
      Object.entries(value).map(([key, item]) => ({
        key,
        value: literalExpression(item),
      })),
    );
  }
  throw new Error(`not a definy value: ${JSON.stringify(value)}`);
}

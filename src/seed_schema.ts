/**
 * イベントの中身の形の検査に使う core の型パーツの宣言 (seeds/schemas/event-types.json) を作り, 値がその形かを確かめる.
 *
 * 宣言は `seeds/store/` の core の型パーツ (`core.event-content` など) から `npm run build:schema` で書き出す。
 * 型パーツの参照はパーツ名の参照 `{"$part": "core.expression"}` にして書く
 */
import { field, optionValue, variantOf } from "./definy_value.ts";

/** 型パーツの宣言を読むパーツ (パーツの参照は `{"$part": ...}`) */
export type SeedSchemaPart = {
  readonly name: string;
  readonly part_type?: unknown;
  readonly expression?: unknown;
};

function definitionName(moduleName: string, partName: string): string {
  return `${moduleName}.${partName}`;
}

/** `{"$part": "core.expression"}` のような型パーツの参照なら, 参照先のパーツ名 */
function referencedPartName(declaration: unknown): string | undefined {
  const name = field(
    field(
      variantOf(declaration)?.tag === "part_reference"
        ? variantOf(declaration)?.payload
        : undefined,
      "part_definition_event_hash",
    ),
    "$part",
  );
  return typeof name === "string" ? name : undefined;
}

/** 宣言の中で参照している型パーツの名前 (`{"$part": ...}` の参照) */
function referencedPartNames(declaration: unknown): ReadonlyArray<string> {
  const name = referencedPartName(declaration);
  if (name !== undefined) {
    return [name];
  }
  if (Array.isArray(declaration)) {
    return declaration.flatMap(referencedPartNames);
  }
  if (typeof declaration === "object" && declaration !== null) {
    return Object.values(declaration).flatMap(referencedPartNames);
  }
  return [];
}

/**
 * `rootNames` の型パーツと, そこから参照をたどれる core の型パーツの宣言 (パーツ名 → 宣言).
 * サーバーとブラウザがイベントの形を `conformsToTypeDeclaration` で検査するときに使う
 * (core は大きいので, 必要な宣言だけを seeds/schemas/event-types.json に書き出す)
 */
function reachableTypeDeclarations(
  coreParts: ReadonlyArray<SeedSchemaPart>,
  rootNames: ReadonlyArray<string>,
): Readonly<Record<string, unknown>> {
  const declarations = new Map(
    coreParts.map((part) => [
      definitionName("core", part.name),
      part.expression,
    ]),
  );
  const result: Record<string, unknown> = {};
  const pending = [...rootNames];
  for (let name = pending.shift(); name !== undefined; name = pending.shift()) {
    if (name in result || !declarations.has(name)) {
      continue;
    }
    const declaration = declarations.get(name);
    result[name] = declaration;
    pending.push(...referencedPartNames(declaration));
  }
  return result;
}

/** イベントの中身の形 (`core.event-content`) の検査に使う宣言. seeds/schemas/event-types.json に書き出す */
export function buildEventTypeDeclarations(
  coreParts: ReadonlyArray<SeedSchemaPart>,
): Readonly<Record<string, unknown>> {
  return reachableTypeDeclarations(coreParts, [
    "core.event-content",
    "core.part-content",
  ]);
}

/**
 * 値 `value` が型パーツの宣言 `declaration` の形か. 型パーツの参照は `resolveTypePart` (パーツ名 → 宣言) でたどる.
 * `allowPartPlaceholders` なら seeds の `{"$part": ...}` を文字列 (パーツ ID) として扱う (seed の JSON を検査するとき)
 */
export function conformsToTypeDeclaration(
  value: unknown,
  declaration: unknown,
  resolveTypePart: (name: string) => unknown,
  allowPartPlaceholders: boolean = true,
): boolean {
  const conforms = (item: unknown, itemDeclaration: unknown): boolean =>
    conformsToTypeDeclaration(
      item,
      itemDeclaration,
      resolveTypePart,
      allowPartPlaceholders,
    );
  const tagged = variantOf(declaration);
  if (tagged === undefined) {
    return true;
  }
  const { tag, payload } = tagged;
  switch (tag) {
    case "type_number":
      return typeof value === "number" && Number.isInteger(value);
    case "type_float":
      return typeof value === "number";
    case "type_string":
      return (
        typeof value === "string" ||
        (allowPartPlaceholders && typeof field(value, "$part") === "string")
      );
    case "type_boolean":
      return typeof value === "boolean";
    case "type_list":
      return (
        Array.isArray(value) &&
        value.every((item) => conforms(item, field(payload, "item_type")))
      );
    case "type_record": {
      const items = Array.isArray(payload) ? payload : [];
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        variantOf(value) !== undefined
      ) {
        return false;
      }
      const keys = new Set(items.map((item) => String(field(item, "key"))));
      return (
        Object.keys(value).every((key) => keys.has(key)) &&
        items.every((item) =>
          conforms(
            (value as Readonly<Record<string, unknown>>)[
              String(field(item, "key"))
            ],
            field(item, "value"),
          ),
        )
      );
    }
    case "type_union": {
      const actual = variantOf(value);
      const variant = (Array.isArray(payload) ? payload : []).find(
        (v) => field(v, "tag") === actual?.tag,
      );
      if (actual === undefined || variant === undefined) {
        return false;
      }
      const payloadType = optionValue(field(variant, "payload_type"));
      return payloadType === undefined
        ? actual.payload === null
        : conforms(actual.payload, payloadType);
    }
    case "part_reference": {
      const name = referencedPartName(declaration);
      return name === undefined ? true : conforms(value, resolveTypePart(name));
    }
  }
  return true;
}

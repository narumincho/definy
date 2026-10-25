/**
 * seeds/*.json の JSON Schema (seeds/schemas/module-seed.schema.json) を, core の型パーツの宣言から作る.
 *
 * パーツの式は `core.expression` の値, パーツの型は `core.type-ast` の値をそのまま書くので
 * (docs/value-encoding.md), 式と型の形は core の型パーツの宣言 (`type_union` / `type_record` ...) が決める.
 * スキーマを手で書くと宣言とずれるので, 宣言を JSON Schema にする. `npm run build:schema` で書き直す
 */
import { field, optionValue, variantOf } from "./definy_value.ts";

type JsonSchema = Readonly<Record<string, unknown>>;

/** seed の JSON のパーツ (`$part` は解決しない) */
export type SeedSchemaPart = {
  readonly name: string;
  readonly part_type?: unknown;
  readonly expression?: unknown;
};

/** パーツ ID の位置. seeds ではパーツ名の参照 `{"$part": "module.name"}` も書ける */
const PART_ID_OR_PLACEHOLDER: JsonSchema = {
  anyOf: [{ type: "string" }, { $ref: "#/definitions/PartPlaceholder" }],
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

/** 型パーツの宣言 (`core.expression` の `type_*` の値) を JSON Schema にする */
export function typeDeclarationToJsonSchema(declaration: unknown): JsonSchema {
  const tagged = variantOf(declaration);
  if (tagged === undefined) {
    return {};
  }
  const { tag, payload } = tagged;
  switch (tag) {
    case "type_number":
      return { type: "integer" };
    case "type_string":
      return PART_ID_OR_PLACEHOLDER;
    case "type_boolean":
      return { type: "boolean" };
    case "type_list":
      return {
        type: "array",
        items: typeDeclarationToJsonSchema(field(payload, "item_type")),
      };
    case "type_record": {
      const items = Array.isArray(payload) ? payload : [];
      return {
        type: "object",
        required: items.map((item) => String(field(item, "key"))),
        properties: Object.fromEntries(
          items.map((item) => [
            String(field(item, "key")),
            typeDeclarationToJsonSchema(field(item, "value")),
          ]),
        ),
        additionalProperties: false,
      };
    }
    case "type_union": {
      const variants = Array.isArray(payload) ? payload : [];
      return {
        anyOf: variants.map((variant) => {
          const key = `#${String(field(variant, "tag"))}`;
          const payloadType = optionValue(field(variant, "payload_type"));
          return {
            type: "object",
            required: [key],
            properties: {
              [key]:
                payloadType === undefined
                  ? { type: "null" }
                  : typeDeclarationToJsonSchema(payloadType),
            },
            additionalProperties: false,
          };
        }),
      };
    }
    case "part_reference": {
      const name = referencedPartName(declaration);
      return name === undefined ? {} : { $ref: `#/definitions/${name}` };
    }
  }
  return {};
}

/** seed のモジュールの型パーツ (`part_type` が `type`) を JSON Schema の定義にする */
function typePartDefinitions(
  moduleName: string,
  parts: ReadonlyArray<SeedSchemaPart>,
): ReadonlyArray<readonly [string, JsonSchema]> {
  return parts
    .filter(
      (part) =>
        variantOf(part.part_type)?.tag === "type" &&
        part.expression !== undefined &&
        part.expression !== null,
    )
    .map((part) => [
      definitionName(moduleName, part.name),
      typeDeclarationToJsonSchema(part.expression),
    ]);
}

const nullable = (ref: string): JsonSchema => ({
  anyOf: [{ $ref: ref }, { type: "null" }],
});

/** seeds/core.json のパーツから seeds/*.json の JSON Schema を作る */
export function buildModuleSeedSchema(
  coreParts: ReadonlyArray<SeedSchemaPart>,
): JsonSchema {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "ModuleSeed",
    description:
      "Seed データファイル (seeds/*.json) のモジュール表現. パーツの式は core.expression, 型は core.type-ast の値 (docs/value-encoding.md). src/seed_schema.ts が core の型パーツの宣言から作る",
    type: "object",
    required: ["module_name", "parts"],
    properties: {
      $schema: { type: ["string", "null"] },
      module_description: {
        default: "",
        allOf: [{ $ref: "#/definitions/Description" }],
      },
      module_name: { type: "string" },
      module_visibility: { $ref: "#/definitions/Visibility" },
      parts: {
        type: "array",
        items: { $ref: "#/definitions/ModulePartEntry" },
      },
    },
    definitions: {
      ModulePartEntry: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { $ref: "#/definitions/Description" },
          visibility: { $ref: "#/definitions/Visibility" },
          part_type: nullable("#/definitions/core.type-ast"),
          expression: nullable("#/definitions/core.expression"),
          content_hash: nullable("#/definitions/ContentHash"),
        },
      },
      Visibility: {
        description:
          "公開/非公開 (core.visibility. docs/visibility.md). 省くと public",
        enum: ["public", "private"],
      },
      Description: {
        anyOf: [
          { type: "string" },
          { type: "array", items: { $ref: "#/definitions/LocalizedText" } },
        ],
      },
      LocalizedText: {
        type: "object",
        required: ["language", "text"],
        properties: {
          language: { type: "string" },
          text: { type: "string" },
        },
      },
      ContentHash: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 255 },
        maxItems: 32,
        minItems: 32,
      },
      PartPlaceholder: {
        description:
          "パーツ名の参照 (`module.part-name`). 読み込み時にシステムアカウントからパーツ ID (URL-safe Base64 の文字列) を導出する",
        type: "object",
        required: ["$part"],
        properties: { $part: { type: "string" } },
        additionalProperties: false,
      },
      ...Object.fromEntries(typePartDefinitions("core", coreParts)),
    },
  };
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
 * (seeds/core.json は大きいので, 必要な宣言だけを seeds/schemas/event-types.json に書き出す)
 */
export function reachableTypeDeclarations(
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
  return reachableTypeDeclarations(coreParts, ["core.event-content"]);
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

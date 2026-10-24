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
      message: { default: "", type: "string" },
      module_description: {
        default: "",
        allOf: [{ $ref: "#/definitions/Description" }],
      },
      module_name: { type: "string" },
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
          part_type: nullable("#/definitions/core.type-ast"),
          expression: nullable("#/definitions/core.expression"),
          content_hash: nullable("#/definitions/ContentHash"),
        },
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

/**
 * 値 `value` が型パーツの宣言 `declaration` の形か. 型パーツの参照は `resolveTypePart` (パーツ名 → 宣言) でたどる.
 * seeds の `{"$part": ...}` は文字列 (パーツ ID) として扱う
 */
export function conformsToTypeDeclaration(
  value: unknown,
  declaration: unknown,
  resolveTypePart: (name: string) => unknown,
): boolean {
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
        typeof value === "string" || typeof field(value, "$part") === "string"
      );
    case "type_boolean":
      return typeof value === "boolean";
    case "type_list":
      return (
        Array.isArray(value) &&
        value.every((item) =>
          conformsToTypeDeclaration(
            item,
            field(payload, "item_type"),
            resolveTypePart,
          ),
        )
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
          conformsToTypeDeclaration(
            (value as Readonly<Record<string, unknown>>)[
              String(field(item, "key"))
            ],
            field(item, "value"),
            resolveTypePart,
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
        : conformsToTypeDeclaration(
            actual.payload,
            payloadType,
            resolveTypePart,
          );
    }
    case "part_reference": {
      const name = referencedPartName(declaration);
      return name === undefined
        ? true
        : conformsToTypeDeclaration(
            value,
            resolveTypePart(name),
            resolveTypePart,
          );
    }
  }
  return true;
}

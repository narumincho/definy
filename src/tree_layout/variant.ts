/**
 * Variant (タグ付きの値) を置換メニューで作る.
 * 選択肢は, 直和型の型パーツ (`partType` が `type` で式が `type_union`) のタグと,
 * その位置で期待する型が型パーツでない直和型のときのそのタグ
 */
import type { DefinyValue } from "../stage1_compiler.ts";
import {
  field,
  isVariant,
  none,
  optionValue,
  some,
  variant,
  variantOf,
  variantPayload,
} from "../definy_value.ts";
import { hole } from "./expression.ts";
import type { PartSnapshot } from "../types.ts";
import type { PatternVariant } from "./match_pattern.ts";
import type { SelectorOption } from "./selector_options.ts";

/**
 * 選択肢の value. `variant:<値を持つなら 1>:<型パーツの ID (無ければ空)>:<タグ>`.
 * パーツ ID は URL-safe Base64 なので `:` を含まない
 */
const VARIANT_PREFIX = "variant:";

export function variantOptionValue(
  typePartIdHash: string | null,
  variant: PatternVariant,
): string {
  return `${VARIANT_PREFIX}${variant.hasPayload ? 1 : 0}:${typePartIdHash ?? ""}:${variant.tag}`;
}

function parseVariantOptionValue(value: string): {
  readonly typePartIdHash: string | null;
  readonly tag: string;
  readonly hasPayload: boolean;
} | null {
  if (!value.startsWith(VARIANT_PREFIX)) {
    return null;
  }
  const [payloadFlag, typePartIdHash, ...tag] = value
    .slice(VARIANT_PREFIX.length)
    .split(":");
  return {
    typePartIdHash:
      typePartIdHash === undefined || typePartIdHash === ""
        ? null
        : typePartIdHash,
    tag: tag.join(":"),
    hasPayload: payloadFlag === "1",
  };
}

/** 直和型の型パーツのタグ. 型パーツでなければ `null` */
function typePartVariants(
  part: Pick<PartSnapshot, "partType" | "expression">,
): ReadonlyArray<PatternVariant> | null {
  if (!isVariant(part.partType, "type")) {
    return null;
  }
  return typeUnionDeclarationVariants(part.expression);
}

/** 型パーツの宣言式が直和型 (`type_union`) なら, そのタグ */
export function typeUnionDeclarationVariants(
  declaration: unknown,
): ReadonlyArray<PatternVariant> | null {
  const variants = variantPayload(declaration, "type_union");
  return Array.isArray(variants)
    ? variants.map((item) => ({
        tag: String(field(item, "tag")),
        hasPayload: optionValue(field(item, "payload_type")) !== undefined,
      }))
    : null;
}

/**
 * 直和型の型パーツのタグの選択肢. 名前は `sample.option-number.some` のようにし,
 * `some` と打てば `module.` を除いた名前と同じく先頭一致で見つかるようにする.
 * `expectedTypePartIdHash` (期待する型の型パーツ) のタグを先に並べる
 */
export function typePartVariantOptions(
  parts: ReadonlyArray<PartSnapshot>,
  expectedTypePartIdHash: string | null = null,
): ReadonlyArray<SelectorOption> {
  const options = parts.flatMap((part) => {
    const variants = typePartVariants(part);
    if (variants === null || part.partIdHash === null) {
      return [];
    }
    return variants.map(
      (variant): SelectorOption & { readonly expected: boolean } => ({
        value: variantOptionValue(part.partIdHash, variant),
        name: `${part.moduleName}.${part.name}.${variant.tag}`,
        detail: variant.hasPayload ? "(value)" : undefined,
        category: "Variant",
        returnType: "any",
        expected: part.partIdHash === expectedTypePartIdHash,
      }),
    );
  });
  return [
    ...options.filter((o) => o.expected),
    ...options.filter((o) => !o.expected),
  ].map(({ expected, ...option }) => {
    void expected;
    return option;
  });
}

/**
 * 期待する型 (`core.type-ast` の値) から, Variant の選択肢に使う情報を求める.
 * 型パーツ (`reference`) ならその ID, 型パーツでない直和型 (`union`) ならそのタグ
 */
export function expectedVariantsFromTypeAst(type: DefinyValue | null): {
  readonly typePartIdHash: string | null;
  readonly unionVariants: ReadonlyArray<PatternVariant>;
} {
  const tagged = variantOf(type);
  if (tagged?.tag === "reference") {
    const partHash = field(tagged.payload, "part_hash");
    return {
      typePartIdHash: partHash == null ? null : String(partHash),
      unionVariants: [],
    };
  }
  if (tagged?.tag === "union" && Array.isArray(tagged.payload)) {
    return {
      typePartIdHash: null,
      unionVariants: unionTypeVariants(tagged.payload),
    };
  }
  return { typePartIdHash: null, unionVariants: [] };
}

/** `core.type-ast` の `union` のペイロード (`[{ tag, payload_type }]`) のタグ */
export function unionTypeVariants(
  items: ReadonlyArray<unknown>,
): ReadonlyArray<PatternVariant> {
  return items.map((item) => ({
    tag: String(field(item, "tag")),
    hasPayload: optionValue(field(item, "payload_type")) !== undefined,
  }));
}

/** 型パーツでない直和型のタグの選択肢 (期待する型が直和型のとき) */
export function unionVariantOptions(
  variants: ReadonlyArray<PatternVariant>,
): ReadonlyArray<SelectorOption> {
  return variants.map((variant) => ({
    value: variantOptionValue(null, variant),
    name: variant.tag,
    detail: variant.hasPayload ? "(value)" : undefined,
    category: "Variant",
    returnType: "any",
  }));
}

/** Variant の式に対応する選択肢の value */
export function variantOptionValueForExpression(node: unknown): string | null {
  const payload = variantPayload(node, "variant");
  if (payload === undefined) {
    return null;
  }
  const typePart = optionValue(field(payload, "type_part"));
  return variantOptionValue(typeof typePart === "string" ? typePart : null, {
    tag: String(field(payload, "tag") ?? ""),
    hasPayload: optionValue(field(payload, "payload")) !== undefined,
  });
}

/**
 * Variant の選択肢 (`variant:...`) の式. 値を持つタグなら値を未入力にする.
 * 今の式が値を持つ Variant で, 選んだタグも値を持つなら, 値を引き継ぐ (タグだけを変える)
 */
export function variantFromOptionValue(
  value: string,
  current: unknown,
): unknown {
  const parsed = parseVariantOptionValue(value);
  if (parsed === null) {
    return undefined;
  }
  const currentPayload = optionValue(
    field(variantPayload(current, "variant"), "payload"),
  );
  return variant("variant", {
    tag: parsed.tag,
    payload: parsed.hasPayload ? some(currentPayload ?? hole()) : none(),
    type_part:
      parsed.typePartIdHash === null ? none() : some(parsed.typePartIdHash),
  });
}

/**
 * Variant の式の型パーツの ID が選択肢の型パーツの ID と違う (同じ名前のモジュールを別のアカウントがコミットしたときなど) とき,
 * 型パーツの名前 (`partNames`: パーツ ID → `module.name`) とタグが同じ選択肢の value. 見つからなければ `null`
 */
export function variantOptionValueByName(
  value: string,
  options: ReadonlyArray<SelectorOption>,
  partNames: ReadonlyMap<string, string>,
): string | null {
  const parsed = parseVariantOptionValue(value);
  if (parsed === null || parsed.typePartIdHash === null) {
    return null;
  }
  const typePartName = partNames.get(parsed.typePartIdHash);
  if (typePartName === undefined) {
    return null;
  }
  return (
    options.find(
      (option) =>
        option.value.startsWith(VARIANT_PREFIX) &&
        option.name === `${typePartName}.${parsed.tag}`,
    )?.value ?? null
  );
}

/**
 * シークレットリテラル (`{ Secret: { id, label, allowed_url_prefixes } }`) を扱う.
 * 値はパーツに入れず, ブラウザに保存する (src/wasi_io_browser.ts, docs/secret.md)
 */
import { collectPartReferenceIds } from "./stage1_compiler.ts";
import type { PartSnapshot } from "./types.ts";

export type SecretLiteral = {
  readonly id: string;
  readonly label: string;
  readonly allowed_url_prefixes: ReadonlyArray<string>;
};

/** 式がシークレットリテラルならその中身 */
export function secretLiteralOf(expression: unknown): SecretLiteral | null {
  if (
    expression === null ||
    typeof expression !== "object" ||
    !("Secret" in expression)
  ) {
    return null;
  }
  const secret = (expression as { readonly Secret: unknown }).Secret as {
    readonly id?: unknown;
    readonly label?: unknown;
    readonly allowed_url_prefixes?: unknown;
  } | null;
  return {
    id: String(secret?.id ?? ""),
    label: String(secret?.label ?? ""),
    allowed_url_prefixes: Array.isArray(secret?.allowed_url_prefixes)
      ? secret.allowed_url_prefixes.map(String)
      : [],
  };
}

/** 式の中に同じ ID のシークレットリテラルがあるか */
function containsSecretLiteral(expression: unknown, id: string): boolean {
  if (expression === null || typeof expression !== "object") {
    return false;
  }
  if (Array.isArray(expression)) {
    return expression.some((item) => containsSecretLiteral(item, id));
  }
  if (secretLiteralOf(expression)?.id === id) {
    return true;
  }
  return Object.values(expression).some((value) =>
    containsSecretLiteral(value, id),
  );
}

/**
 * シークレットの使用箇所: そのシークレットのパーツを参照しているパーツと,
 * 同じ ID のシークレットリテラルを直接書いているパーツ (自分自身は除く)
 */
export function findSecretUsages(
  parts: ReadonlyArray<PartSnapshot>,
  secretPart: { readonly partId: string; readonly partIdHash: string | null },
  secretId: string,
): ReadonlyArray<PartSnapshot> {
  return parts.filter(
    (part) =>
      part.partId !== secretPart.partId &&
      ((secretPart.partIdHash !== null &&
        collectPartReferenceIds(part.expression).includes(
          secretPart.partIdHash,
        )) ||
        containsSecretLiteral(part.expression, secretId)),
  );
}

/**
 * シークレットリテラル (`{"#secret": { id, label, allowed_url_prefixes }}`) を扱う.
 * 値はパーツに入れず, ブラウザに保存する (src/wasi_io_browser.ts, docs/secret.md)
 */
import { variantOf } from "./definy_value.ts";
import { collectPartReferenceIds } from "./stage1_compiler.ts";
import type { PartSnapshot } from "./types.ts";

export type SecretLiteral = {
  readonly id: string;
  readonly label: string;
  readonly allowed_url_prefixes: ReadonlyArray<string>;
};

/** 式がシークレットリテラルならその中身 */
export function secretLiteralOf(expression: unknown): SecretLiteral | null {
  const tagged = variantOf(expression);
  if (tagged?.tag !== "secret") {
    return null;
  }
  const secret = tagged.payload as {
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

/** 設定画面のシークレット一覧の 1 行 */
export type SecretListItem<Stored> = {
  readonly id: string;
  readonly label: string;
  /** シークレットリテラルだけを式にしているパーツ (シークレットのパーツ) */
  readonly parts: ReadonlyArray<PartSnapshot>;
  /** このブラウザに入れてある値 (無ければ `undefined`) */
  readonly stored: Stored | undefined;
};

/**
 * 設定画面のシークレット一覧: シークレットのパーツと, このブラウザに値を入れてあるシークレットを ID ごとにまとめる.
 * パーツが消えても値が残っているもの (パーツが無い行) も出す. 名前順
 */
export function listSecrets<Stored extends { readonly label: string }>(
  parts: ReadonlyArray<PartSnapshot>,
  stored: Readonly<Record<string, Stored>>,
): ReadonlyArray<SecretListItem<Stored>> {
  const byId = new Map<string, { label: string; parts: Array<PartSnapshot> }>();
  for (const part of parts) {
    const secret = secretLiteralOf(part.expression);
    if (secret === null) {
      continue;
    }
    const item = byId.get(secret.id);
    if (item === undefined) {
      byId.set(secret.id, { label: secret.label, parts: [part] });
    } else {
      item.parts.push(part);
    }
  }
  for (const [id, value] of Object.entries(stored)) {
    if (!byId.has(id)) {
      byId.set(id, { label: value.label, parts: [] });
    }
  }
  return [...byId.entries()]
    .map(([id, item]) => ({
      id,
      label: item.label,
      parts: item.parts,
      stored: stored[id],
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

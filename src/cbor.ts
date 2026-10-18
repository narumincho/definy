/**
 * Pure browser- and worker-safe CBOR decoder, encoder & module commit extractor for definy.
 * Free of node:crypto and other Node.js specific APIs.
 */

/**
 * Base64 文字列（標準 / URL-safe / パディング省略すべて対応）を Uint8Array にデコードする
 */
export function base64ToBytes(base64: string): Uint8Array {
  const isUrlSafe = base64.includes("-") || base64.includes("_");
  return Uint8Array.fromBase64(base64, {
    alphabet: isUrlSafe ? "base64url" : "base64",
    lastChunkHandling: "loose",
  });
}

/**
 * Uint8Array を標準 Base64 文字列にエンコードする
 */
export function bytesToBase64(bytes: Uint8Array): string {
  return bytes.toBase64();
}

/**
 * Uint8Array を URL-safe Base64 (パディングなし) にエンコードする
 */
export function bytesToUrlSafeBase64NoPad(bytes: Uint8Array): string {
  return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
}

export function toUint8Array(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (
    Array.isArray(value) &&
    value.every((n) => typeof n === "number" && n >= 0 && n <= 255)
  ) {
    return new Uint8Array(value as number[]);
  }
  return undefined;
}

export function decodeCborItem(
  bytes: Uint8Array,
  offset = 0,
): [unknown, number] {
  if (offset >= bytes.length) {
    throw new Error("Unexpected EOF in CBOR");
  }
  const initial = bytes[offset++];
  if (initial === undefined) {
    throw new Error("Unexpected EOF in CBOR");
  }
  const major = initial >> 5;
  const info = initial & 0x1f;
  let val = 0;
  if (info < 24) {
    val = info;
  } else if (info === 24) {
    const next = bytes[offset++];
    if (next === undefined) {
      throw new Error("Unexpected EOF in CBOR");
    }
    val = next;
  } else if (info === 25) {
    const b0 = bytes[offset];
    const b1 = bytes[offset + 1];
    if (b0 === undefined || b1 === undefined) {
      throw new Error("Unexpected EOF in CBOR");
    }
    val = (b0 << 8) | b1;
    offset += 2;
  } else if (info === 26) {
    val = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    offset += 4;
  } else if (info === 27) {
    val = Number(
      new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0),
    );
    offset += 8;
  }

  switch (major) {
    case 0:
      return [val, offset];
    case 1:
      return [-1 - val, offset];
    case 2:
      return [bytes.subarray(offset, offset + val), offset + val];
    case 3:
      return [
        new TextDecoder().decode(bytes.subarray(offset, offset + val)),
        offset + val,
      ];
    case 4: {
      const arr: Array<unknown> = [];
      for (let i = 0; i < val; i++) {
        const [elem, next] = decodeCborItem(bytes, offset);
        arr.push(elem);
        offset = next;
      }
      return [arr, offset];
    }
    case 5: {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < val; i++) {
        const [k, nextK] = decodeCborItem(bytes, offset);
        const [v, nextV] = decodeCborItem(bytes, nextK);
        obj[String(k)] = v;
        offset = nextV;
      }
      return [obj, offset];
    }
    case 6: {
      const [taggedVal, next] = decodeCborItem(bytes, offset);
      return [{ __tag: val, value: taggedVal }, next];
    }
    case 7: {
      if (info === 20) return [false, offset];
      if (info === 21) return [true, offset];
      if (info === 22) return [null, offset];
      if (info === 27) {
        const f = new DataView(
          bytes.buffer,
          bytes.byteOffset + offset - 8,
          8,
        ).getFloat64(0);
        return [f, offset];
      }
      return [val, offset];
    }
    default:
      return [null, offset];
  }
}

function encodeCborHeader(major: number, length: number): Uint8Array {
  const prefix = major << 5;
  if (length < 24) {
    return new Uint8Array([prefix | length]);
  }
  if (length < 256) {
    return new Uint8Array([prefix | 24, length]);
  }
  if (length < 65536) {
    return new Uint8Array([prefix | 25, (length >> 8) & 0xff, length & 0xff]);
  }
  const buf = new Uint8Array(5);
  buf[0] = prefix | 26;
  new DataView(buf.buffer).setUint32(1, length);
  return buf;
}

function concatBytes(chunks: ReadonlyArray<Uint8Array>): Uint8Array {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * 任意の JS 値を CBOR バイト列にエンコードする
 */
export function encodeCborItem(value: unknown): Uint8Array {
  if (value === null || value === undefined) {
    return new Uint8Array([0xf6]);
  }
  if (typeof value === "boolean") {
    return new Uint8Array([value ? 0xf5 : 0xf4]);
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        return encodeCborHeader(0, value);
      }
      return encodeCborHeader(1, -1 - value);
    }
    const buf = new Uint8Array(9);
    buf[0] = 0xfb;
    new DataView(buf.buffer).setFloat64(1, value);
    return buf;
  }
  if (typeof value === "string") {
    const strBytes = new TextEncoder().encode(value);
    return concatBytes([encodeCborHeader(3, strBytes.length), strBytes]);
  }
  if (value instanceof Uint8Array) {
    return concatBytes([encodeCborHeader(2, value.length), value]);
  }
  if (Array.isArray(value)) {
    const chunks: Array<Uint8Array> = [encodeCborHeader(4, value.length)];
    for (const item of value) {
      chunks.push(encodeCborItem(item));
    }
    return concatBytes(chunks);
  }
  if (
    value &&
    typeof value === "object" &&
    "__tag" in value &&
    "value" in value &&
    typeof (value as { readonly __tag: unknown }).__tag === "number"
  ) {
    const tagged = value as { readonly __tag: number; readonly value: unknown };
    return concatBytes([
      encodeCborHeader(6, tagged.__tag),
      encodeCborItem(tagged.value),
    ]);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const chunks: Array<Uint8Array> = [encodeCborHeader(5, entries.length)];
    for (const [k, v] of entries) {
      chunks.push(encodeCborItem(k));
      chunks.push(encodeCborItem(v));
    }
    return concatBytes(chunks);
  }
  return new Uint8Array([0xf6]);
}

/**
 * Uint8Array の SHA-256 ダイジェストを Uint8Array として計算する (標準 Web Crypto 使用)
 */
export async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return new Uint8Array(digest);
}

/**
 * Uint8Array の SHA-256 ダイジェストを計算し、URL-safe Base64 (`EventHashId` 形式) を返す
 */
export async function sha256EventHashId(bytes: Uint8Array): Promise<string> {
  return bytesToUrlSafeBase64NoPad(await sha256Bytes(bytes));
}

/** 言語ごとのテキスト (`[{ language: "en", text: "..." }, ...]`) */
export interface LocalizedTextEntry {
  readonly language: string;
  readonly text: string;
}

export type LocalizedText = ReadonlyArray<LocalizedTextEntry>;

function decodeLocalizedText(raw: unknown): LocalizedText {
  if (typeof raw === "string") {
    return raw.length > 0 ? [{ language: "en", text: raw }] : [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry: unknown): LocalizedText => {
    const e = entry as Partial<LocalizedTextEntry> | null;
    return typeof e?.language === "string" && typeof e.text === "string"
      ? [{ language: e.language, text: e.text }]
      : [];
  });
}

export interface DecodedPart {
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly expression?: unknown;
  readonly contentHash?: string | null;
}

export interface DecodedModuleCommit {
  readonly moduleName: string;
  readonly moduleDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash: string | null;
  readonly parts: ReadonlyArray<DecodedPart>;
}

export function extractModuleCommit(
  signedBytesBase64: string,
): DecodedModuleCommit | null {
  try {
    const bytes = base64ToBytes(signedBytesBase64);
    const [signedRaw] = decodeCborItem(bytes);
    if (!signedRaw || typeof signedRaw !== "object") return null;
    const signedObj = signedRaw as Record<string, unknown>;
    const eventBinaryField = signedObj.event_binary as
      { value?: unknown } | undefined;
    const innerBytes = toUint8Array(
      eventBinaryField?.value ?? eventBinaryField,
    );
    if (!innerBytes) return null;
    const [innerRaw] = decodeCborItem(innerBytes);
    if (!innerRaw || typeof innerRaw !== "object") return null;
    const innerObj = innerRaw as Record<string, unknown>;
    const contentObj = innerObj.content as Record<string, unknown> | undefined;
    if (!contentObj || !("ModuleCommit" in contentObj)) return null;

    const mc = contentObj.ModuleCommit as Record<string, unknown>;
    const moduleDescription = decodeLocalizedText(mc.module_description);

    const rawParts = (mc.parts as ReadonlyArray<Record<string, unknown>>) ?? [];
    const parts: ReadonlyArray<DecodedPart> = rawParts.map((p) => {
      const hashBytes = toUint8Array(p.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : typeof p.content_hash === "string"
          ? p.content_hash
          : null;

      return {
        name: String(p.name ?? ""),
        description: decodeLocalizedText(p.description),
        partType: p.part_type,
        expression: p.expression ?? null,
        contentHash,
      };
    });

    return {
      moduleName: String(mc.module_name ?? ""),
      moduleDescription,
      message: String(mc.message ?? ""),
      parentCommitHash:
        typeof mc.parent_commit_hash === "string"
          ? mc.parent_commit_hash
          : null,
      parts,
    };
  } catch {
    return null;
  }
}

export interface DecodedCreateAccount {
  readonly accountId: string;
  readonly accountName: string;
}

/**
 * SignedEvent バイナリ（Base64）からアカウント作成情報（accountId, accountName）を抽出する
 */
export function extractCreateAccount(
  signedBytesBase64: string,
): DecodedCreateAccount | null {
  try {
    const bytes = base64ToBytes(signedBytesBase64);
    const [signedRaw] = decodeCborItem(bytes);
    if (!signedRaw || typeof signedRaw !== "object") return null;
    const signedObj = signedRaw as Record<string, unknown>;
    const eventBinaryField = signedObj.event_binary as
      { value?: unknown } | undefined;
    const innerBytes = toUint8Array(
      eventBinaryField?.value ?? eventBinaryField,
    );
    if (!innerBytes) return null;
    const [innerRaw] = decodeCborItem(innerBytes);
    if (!innerRaw || typeof innerRaw !== "object") return null;
    const innerObj = innerRaw as Record<string, unknown>;
    const contentObj = innerObj.content as Record<string, unknown> | undefined;
    if (!contentObj || !("CreateAccount" in contentObj)) return null;

    const accountBytes = toUint8Array(innerObj.account_id);
    const accountId = accountBytes
      ? bytesToUrlSafeBase64NoPad(accountBytes)
      : "";

    const ca = contentObj.CreateAccount as Record<string, unknown>;
    return {
      accountId,
      accountName: String(ca.account_name ?? ""),
    };
  } catch {
    return null;
  }
}

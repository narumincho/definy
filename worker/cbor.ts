/**
 * Base64 文字列（標準 / URL-safe / パディング省略すべて対応）を Uint8Array にデコードする
 */
export function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binString = atob(padded);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uint8Array を標準 Base64 文字列にエンコードする
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binString = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binString += String.fromCharCode(byte);
    }
  }
  return btoa(binString);
}

/**
 * Uint8Array を URL-safe Base64 (パディングなし) にエンコードする
 */
export function bytesToUrlSafeBase64NoPad(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Uint8Array の SHA-256 ダイジェストを Uint8Array として計算する
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

/**
 * `definy-event` の `derive_module_id` と同一のアルゴリズムで Module ID の内部 32 バイトを導出する
 */
export async function deriveModuleIdBytes(
  accountBytes: Uint8Array,
  moduleName: string,
): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode("definy:module:");
  const sep = new TextEncoder().encode(":");
  const nameBytes = new TextEncoder().encode(moduleName);
  const buf = new Uint8Array(
    prefix.length + accountBytes.length + sep.length + nameBytes.length,
  );
  buf.set(prefix, 0);
  buf.set(accountBytes, prefix.length);
  buf.set(sep, prefix.length + accountBytes.length);
  buf.set(nameBytes, prefix.length + accountBytes.length + sep.length);
  const first = await sha256Bytes(buf);
  return await sha256Bytes(first);
}

/**
 * `definy-event` の `derive_module_part_id` と同一のアルゴリズムで Part ID (`EventHashId` 文字列) を導出する
 */
export async function deriveModulePartId(
  moduleIdBytes: Uint8Array,
  partName: string,
): Promise<string> {
  const sep = new TextEncoder().encode(":part:");
  const nameBytes = new TextEncoder().encode(partName);
  const buf = new Uint8Array(
    moduleIdBytes.length + sep.length + nameBytes.length,
  );
  buf.set(moduleIdBytes, 0);
  buf.set(sep, moduleIdBytes.length);
  buf.set(nameBytes, moduleIdBytes.length + sep.length);
  const first = await sha256Bytes(buf);
  const second = await sha256Bytes(first);
  return bytesToUrlSafeBase64NoPad(second);
}

/**
 * CBOR バイナリから 1 アイテムをデコードし、`[値, 次のオフセット]` を返す
 */
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
      const arr: unknown[] = [];
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
    const chunks: Uint8Array[] = [encodeCborHeader(4, value.length)];
    for (const item of value) {
      chunks.push(encodeCborItem(item));
    }
    return concatBytes(chunks);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const chunks: Uint8Array[] = [encodeCborHeader(5, entries.length)];
    for (const [k, v] of entries) {
      chunks.push(encodeCborItem(k));
      chunks.push(encodeCborItem(v));
    }
    return concatBytes(chunks);
  }
  return new Uint8Array([0xf6]);
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

export interface ParsedSignedEventMeta {
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
  readonly referencedContentHashes: ReadonlyArray<string>;
}

/**
 * CBOR 形式の SignedEvent からインデックス用メタデータと参照 CAS ハッシュ一覧を抽出する。
 * テスト用のダミーバイト列など CBOR として解釈できない場合はデフォルト値を返す。
 */
export function parseSignedEventMetadata(
  bytes: Uint8Array,
  fallbackEventType = "module_commit",
): ParsedSignedEventMeta {
  const now = new Date();
  const fallback: ParsedSignedEventMeta = {
    accountId: "",
    eventType: fallbackEventType,
    createdAtRfc3339: now.toISOString(),
    timeMs: now.getTime(),
    referencedContentHashes: [],
  };

  try {
    const [signedRaw] = decodeCborItem(bytes);
    if (!signedRaw || typeof signedRaw !== "object") {
      return fallback;
    }
    const signedObj = signedRaw as Record<string, unknown>;
    const eventBinaryField = signedObj.event_binary as
      | { value?: unknown }
      | undefined;
    const innerBytes = toUint8Array(
      eventBinaryField?.value ?? eventBinaryField,
    );
    if (!innerBytes) {
      return fallback;
    }
    const [innerRaw] = decodeCborItem(innerBytes);
    if (!innerRaw || typeof innerRaw !== "object") {
      return fallback;
    }
    const innerObj = innerRaw as Record<string, unknown>;
    const accountBytes = toUint8Array(innerObj.account_id);
    const accountId = accountBytes
      ? bytesToUrlSafeBase64NoPad(accountBytes)
      : "";

    const timeField = innerObj.time as { value?: unknown } | undefined;
    const timeSec = typeof timeField?.value === "number"
      ? timeField.value
      : now.getTime() / 1000;
    const timeMs = Math.round(timeSec * 1000);
    const createdAtRfc3339 = new Date(timeMs).toISOString();

    const contentObj = innerObj.content as Record<string, unknown> | undefined;
    let eventType = fallbackEventType;
    const referencedHashes = new Set<string>();

    if (contentObj && typeof contentObj === "object") {
      if ("CreateAccount" in contentObj) {
        eventType = "create_account";
      } else if ("ChangeProfile" in contentObj) {
        eventType = "change_profile";
      } else if ("ModuleCommit" in contentObj) {
        eventType = "module_commit";
        const mc = contentObj.ModuleCommit as
          | { parts?: ReadonlyArray<Record<string, unknown>> }
          | undefined;
        if (mc && Array.isArray(mc.parts)) {
          for (const part of mc.parts) {
            if (!part || typeof part !== "object") continue;
            if (part.expression == null && part.content_hash != null) {
              const hashBytes = toUint8Array(part.content_hash);
              if (hashBytes) {
                referencedHashes.add(bytesToUrlSafeBase64NoPad(hashBytes));
              } else if (typeof part.content_hash === "string") {
                referencedHashes.add(part.content_hash);
              }
            }
          }
        }
      }
    }

    return {
      accountId,
      eventType,
      createdAtRfc3339,
      timeMs,
      referencedContentHashes: Array.from(referencedHashes),
    };
  } catch {
    return fallback;
  }
}

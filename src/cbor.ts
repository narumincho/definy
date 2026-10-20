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
      const arr: unknown[] = [];
      for (let i = 0; i < val; i++) {
        const [elem, next] = decodeCborItem(bytes, offset);
        arr.push(elem);
        offset = next;
      }
      return [arr as ReadonlyArray<unknown>, offset];
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
    return concatBytes([
      encodeCborHeader(4, value.length),
      ...value.map((item) => encodeCborItem(item)),
    ]);
  }
  if (
    value &&
    typeof value === "object" &&
    "__float64" in value &&
    typeof (value as { readonly __float64: unknown }).__float64 === "number"
  ) {
    const num = (value as { readonly __float64: number }).__float64;
    const buf = new Uint8Array(9);
    buf[0] = 0xfb;
    new DataView(buf.buffer).setFloat64(1, num);
    return buf;
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
    return concatBytes([
      encodeCborHeader(5, entries.length),
      ...entries.flatMap(([k, v]) => [encodeCborItem(k), encodeCborItem(v)]),
    ]);
  }
  return new Uint8Array([0xf6]);
}

/**
 * 純粋な TypeScript による同期 SHA-256 実装 (Web Crypto / Node.js の暗号モジュールに依存せず、ブラウザ/Worker/SSR で動作)
 */
export function sha256BytesSync(bytes: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = BigInt(len) * 8n;
  const totalLen = ((len + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes, 0);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setBigUint64(totalLen - 8, bitLen, false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const w15 = w[t - 15] ?? 0;
      const w2 = w[t - 2] ?? 0;
      const w16 = w[t - 16] ?? 0;
      const w7 = w[t - 7] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[t] = (w16 + s0 + w7 + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const kt = K[t] ?? 0;
      const wt = w[t] ?? 0;
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + kt + wt) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

/**
 * Uint8Array の SHA-256 ダイジェストを同期的に計算し、URL-safe Base64 (`EventHashId` 形式) を返す
 */
export function sha256EventHashIdSync(bytes: Uint8Array): string {
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(bytes));
}

const TEXT_ENCODER = new TextEncoder();
const MODULE_PREFIX_BYTES = TEXT_ENCODER.encode("definy:module:");
const COLON_SEP_BYTES = TEXT_ENCODER.encode(":");
const PART_SEP_BYTES = TEXT_ENCODER.encode(":part:");

/**
 * definy-event の `derive_module_id` と同一のアルゴリズムで Module ID を同期的に導出する
 */
export function deriveModuleIdBytesSync(
  accountBytes: Uint8Array,
  moduleName: string,
): Uint8Array {
  const nameBytes = TEXT_ENCODER.encode(moduleName);
  const buf = new Uint8Array(
    MODULE_PREFIX_BYTES.length +
      accountBytes.length +
      COLON_SEP_BYTES.length +
      nameBytes.length,
  );
  buf.set(MODULE_PREFIX_BYTES, 0);
  buf.set(accountBytes, MODULE_PREFIX_BYTES.length);
  buf.set(COLON_SEP_BYTES, MODULE_PREFIX_BYTES.length + accountBytes.length);
  buf.set(
    nameBytes,
    MODULE_PREFIX_BYTES.length + accountBytes.length + COLON_SEP_BYTES.length,
  );
  return sha256BytesSync(sha256BytesSync(buf));
}

/**
 * definy-event の `derive_module_part_id` と同一のアルゴリズムで Part ID (`EventHashId` 文字列) を同期的に導出する
 */
export function deriveModulePartIdSync(
  moduleIdBytes: Uint8Array,
  partName: string,
): string {
  const nameBytes = TEXT_ENCODER.encode(partName);
  const buf = new Uint8Array(
    moduleIdBytes.length + PART_SEP_BYTES.length + nameBytes.length,
  );
  buf.set(moduleIdBytes, 0);
  buf.set(PART_SEP_BYTES, moduleIdBytes.length);
  buf.set(nameBytes, moduleIdBytes.length + PART_SEP_BYTES.length);
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(sha256BytesSync(buf)));
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
export type LocalizedTextEntry = {
  readonly language: string;
  readonly text: string;
};

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

export type DecodedPart = {
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly expression?: unknown;
  readonly contentHash?: string | null;
  readonly partIdHash?: string | null;
};

export type DecodedModuleCommit = {
  readonly moduleName: string;
  /** モジュール ID (アカウントとモジュール名から導出, URL-safe Base64). アカウントが読めなければ `null` */
  readonly moduleIdHash: string | null;
  readonly moduleDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash: string | null;
  readonly parts: ReadonlyArray<DecodedPart>;
};

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
    const moduleName = String(mc.module_name ?? "");
    const moduleDescription = decodeLocalizedText(mc.module_description);

    const accountBytes = toUint8Array(innerObj.account_id);
    const moduleIdBytes = accountBytes
      ? deriveModuleIdBytesSync(accountBytes, moduleName)
      : null;

    const rawParts = (mc.parts as ReadonlyArray<Record<string, unknown>>) ?? [];
    const parts: ReadonlyArray<DecodedPart> = rawParts.map((p) => {
      const partName = String(p.name ?? "");
      const hashBytes = toUint8Array(p.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : typeof p.content_hash === "string"
          ? p.content_hash
          : null;
      const partIdHash = moduleIdBytes
        ? deriveModulePartIdSync(moduleIdBytes, partName)
        : null;

      return {
        name: partName,
        description: decodeLocalizedText(p.description),
        partType: p.part_type,
        expression: p.expression ?? null,
        contentHash,
        partIdHash,
      };
    });

    return {
      moduleName,
      moduleIdHash: moduleIdBytes
        ? bytesToUrlSafeBase64NoPad(moduleIdBytes)
        : null,
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

export type DecodedCreateAccount = {
  readonly accountId: string;
  readonly accountName: string;
};

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

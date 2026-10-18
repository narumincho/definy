/**
 * Pure browser-safe CBOR decoder & module commit extractor for definy frontend.
 * Free of node:crypto and other Node.js specific APIs.
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

export function bytesToUrlSafeBase64NoPad(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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

export interface DecodedPart {
  readonly name: string;
  readonly description: string;
  readonly partType: unknown;
  readonly expression?: unknown;
  readonly contentHash?: string | null;
}

export interface DecodedModuleCommit {
  readonly moduleName: string;
  readonly moduleDescription: string;
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
    const rawDesc = mc.module_description;
    let moduleDescription = "";
    if (Array.isArray(rawDesc)) {
      moduleDescription = rawDesc
        .map((d: { text?: string }) => d.text ?? "")
        .join(" ");
    } else if (typeof rawDesc === "string") {
      moduleDescription = rawDesc;
    }

    const rawParts = (mc.parts as ReadonlyArray<Record<string, unknown>>) ?? [];
    const parts: ReadonlyArray<DecodedPart> = rawParts.map((p) => {
      let pDesc = "";
      if (Array.isArray(p.description)) {
        pDesc = p.description
          .map((d: { text?: string }) => d.text ?? "")
          .join(" ");
      } else if (typeof p.description === "string") {
        pDesc = p.description;
      }

      const hashBytes = toUint8Array(p.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : typeof p.content_hash === "string"
          ? p.content_hash
          : null;

      return {
        name: String(p.name ?? ""),
        description: pDesc,
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

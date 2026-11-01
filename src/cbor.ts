/**
 * definy の CBOR のエンコーダーとデコーダー. ブラウザ・Node.js・Worker で動く (Node.js 固有の API を使わない)
 */
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
  if (length <= 0xffffffff) {
    const buf = new Uint8Array(5);
    buf[0] = prefix | 26;
    new DataView(buf.buffer).setUint32(1, length);
    return buf;
  }
  // 2^32 以上 (definy の数の 0x000fffffffffffff など) は 8 バイト
  const buf = new Uint8Array(9);
  buf[0] = prefix | 27;
  new DataView(buf.buffer).setBigUint64(1, BigInt(length));
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

export const append =
  (a: Uint8Array) =>
  (b: Uint8Array): Uint8Array => {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  };

export const separateAtImpl = (
  binary: Uint8Array,
  index: number
): { readonly before: Uint8Array; readonly after: Uint8Array } => {
  return { before: binary.subarray(0, index), after: binary.subarray(index) };
};

export const toStringReadAsUtf8Impl = (binary: Uint8Array): string | null => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(binary);
  } catch (error) {
    return null;
  }
};

export const fromNodeBuffer = (buffer: Buffer): Uint8Array => {
  return new Uint8Array(buffer);
};

export const isEmpty = (binary: Uint8Array): boolean => {
  return binary.length === 0;
};

export const fromStringWriteAsUtf8 = (text: string): Uint8Array => {
  return new TextEncoder().encode(text);
};

export const empty = new Uint8Array();

export const fromFloat64 = (v: number): Uint8Array => {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, v, false);
  return new Uint8Array(buffer);
};

export const toArray = (binary: Uint8Array): ReadonlyArray<number> => {
  return [...binary];
};

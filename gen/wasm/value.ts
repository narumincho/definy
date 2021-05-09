/**
 * 1番左のビットをONにする
 * ```
 * 010101011
 * ↓
 * 110101011
 * ```
 */
const onLeftBit = (value: number): number => {
  return value | 0b10000000;
};

/**
 * 右端から数えて場所から7bit分を取得する
 * ```
 * 101010101011
 * ↓ offset 2
 *    0101010
 * ```
 */
const get7Bits = (value: number, offset: number): number => {
  return (value >> offset) & 0b1111111;
};

/**
 * 8bit を表示する. デバッグ用
 */
const byteToString = (value: number): string => {
  return value.toString(2).padStart(8, "0");
};

/**
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#primitive-encoding-types"
 *
 * 符号付き32bit整数1byte ～ 5 byteの可変長のバイナリに変換する
 * LEB128
 */
export const int32ToBinary = (x: number): ReadonlyArray<number> => {
  /** 0~6 ビット目 */
  const b0 = get7Bits(x, 0);
  /** 7~13 ビット目 */
  const b1 = get7Bits(x, 7);
  /** 14~20 ビット目 */
  const b2 = get7Bits(x, 14);
  /** 21~27 ビット目 */
  const b3 = get7Bits(x, 21);
  /** 28~31 ビット目. (32~34bitは常にON) */
  const b4 = get7Bits(x, 28) | 0b01110000;

  if (-(2 ** 6) <= x && x <= 2 ** 6 - 1) {
    return [b0];
  }
  if (-(2 ** 13) <= x && x <= 2 ** 13 - 1) {
    return [onLeftBit(b0), b1];
  }
  if (-(2 ** 20) <= x && x <= 2 ** 20 - 1) {
    return [onLeftBit(b0), onLeftBit(b1), b2];
  }

  if (-(2 ** 27) <= x && x <= 2 ** 27 - 1) {
    return [onLeftBit(b0), onLeftBit(b1), onLeftBit(b2), b3];
  }

  return [onLeftBit(b0), onLeftBit(b1), onLeftBit(b2), onLeftBit(b3), b4];
};

/**
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#primitive-encoding-types
 *
 * 符号なし32bit整数を1byte ～ 5 byteの可変長のバイナリに変換する
 * LEB128
 */
export const uInt32ToBinary = (x: number): ReadonlyArray<number> => {
  /** 0~6 ビット目 */
  const b0 = get7Bits(x, 0);
  /** 7~13 ビット目 */
  const b1 = get7Bits(x, 7);
  /** 14~20 ビット目 */
  const b2 = get7Bits(x, 14);
  /** 21~27 ビット目 */
  const b3 = get7Bits(x, 21);
  /** 28~31 ビット目. (32~34bitは常にOFF) */
  const b4 = get7Bits(x, 28);

  if (b1 === 0 && b2 === 0 && b3 === 0 && b4 === 0) {
    return [b0];
  }
  if (b2 === 0 && b3 === 0 && b4 === 0) {
    return [onLeftBit(b0), b1];
  }
  if (b3 === 0 && b4 === 0) {
    return [onLeftBit(b0), onLeftBit(b1), b2];
  }

  if (b4 === 0) {
    return [onLeftBit(b0), onLeftBit(b1), onLeftBit(b2), b3];
  }

  return [onLeftBit(b0), onLeftBit(b1), onLeftBit(b2), onLeftBit(b3), b4];
};

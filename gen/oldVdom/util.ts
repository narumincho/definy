import type { Color } from "./view";

export const mapMapValue = <Key, Input, Output>(
  input: ReadonlyMap<Key, Input>,
  func: (value: Input, key: Key) => Output | undefined
): ReadonlyMap<Key, Output> => {
  const result: Map<Key, Output> = new Map();
  for (const [key, value] of input) {
    const newValue = func(value, key);
    if (newValue !== undefined) {
      result.set(key, newValue);
    }
  }
  return result;
};

/**
 * 色を色コードに変換する
 * ```ts
 * { r: 1, g: 1, b: 1 }
 * ```
 * ↓
 * ```ts
 * "#ffffff"
 * ```
 */
export const colorToHexString = (color: Color): string =>
  "#" +
  numberTo1byteString(color.r) +
  numberTo1byteString(color.g) +
  numberTo1byteString(color.b);

/**
 * 0...1 を 00...ff に変換する
 */
const numberTo1byteString = (value: number): string =>
  Math.max(Math.min(Math.floor(value * 256), 255), 0)
    .toString(16)
    .padStart(2, "0");

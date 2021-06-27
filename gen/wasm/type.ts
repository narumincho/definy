import { vectorToWasmBinary } from "./vector";

/**
 * @package
 */
export type NumType = "i32" | "i64" | "f32" | "f64";

/**
 * @package
 */
export const numTypeToWasmBinary = (
  numType: NumType
): ReadonlyArray<number> => {
  switch (numType) {
    case "i32":
      return [0x7f];
    case "i64":
      return [0x7e];
    case "f32":
      return [0x7d];
    case "f64":
      return [0x7c];
  }
};

/**
 * @package
 * functype
 * https://webassembly.github.io/spec/core/syntax/types.html#syntax-functype
 */
export type FunctionType = {
  readonly parameter: ReadonlyArray<NumType>;
  readonly result: ReadonlyArray<NumType>;
};

/**
 * @package
 */
export const functionTypeToWasmBinary = (
  functionType: FunctionType
): ReadonlyArray<number> => {
  return [
    0x60,
    ...vectorToWasmBinary(functionType.parameter.map(numTypeToWasmBinary)),
    ...vectorToWasmBinary(functionType.result.map(numTypeToWasmBinary)),
  ];
};

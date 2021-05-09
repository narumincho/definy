import { vectorToWasmBinary } from "./vector";

export type NumType = "i32" | "i64" | "f32" | "f64";

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
 * functype
 * https://webassembly.github.io/spec/core/syntax/types.html#syntax-functype
 */
export type FunctionType = {
  parameter: ReadonlyArray<NumType>;
  result: ReadonlyArray<NumType>;
};

export const functionTypeToWasmBinary = (
  functionType: FunctionType
): ReadonlyArray<number> => {
  return [
    0x60,
    ...vectorToWasmBinary(functionType.parameter.map(numTypeToWasmBinary)),
    ...vectorToWasmBinary(functionType.result.map(numTypeToWasmBinary)),
  ];
};

import { FunctionType, functionTypeToWasmBinary } from "./type";
import { uInt32ToBinary } from "./value";
import { vectorToWasmBinary } from "./vector";

export type Wasm = {
  functionList: ReadonlyArray<WasmFunction>;
};

export type WasmFunction = {
  export: { tag: "export"; name: string } | { tag: "local" };
  expr: Opt;
};

/**
 * WASM_BINARY_MAGIC
 *
 * magic_cookie
 *
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#module-contents
 */
const wasmBinaryMagic: ReadonlyArray<number> = [0x00, 0x61, 0x73, 0x6d];

/**
 * WASM_BINARY_VERSION
 *
 * version
 *
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#module-contents
 */
const wasmBinaryVersion: ReadonlyArray<number> = [0x01, 0x00, 0x00, 0x00];

/**
 * セクションの内容をバイナリ形式に変換する
 */
const sectionToWasmBinary = (
  sectionCode: number,
  binary: ReadonlyArray<number>
) => {
  return [sectionCode, ...uInt32ToBinary(binary.length), ...binary];
};

/**
 * 使われる型の組み合わせを指定する
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#type-section
 */

const typeSection = (
  functionTypeList: ReadonlyArray<FunctionType>
): ReadonlyArray<number> => {
  return sectionToWasmBinary(
    0x01,
    vectorToWasmBinary(functionTypeList.map(functionTypeToWasmBinary))
  );
};

/**
 * 関数の型をTypeSectionで指定した番号で指定する
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#function-section
 */
const functionSection = (
  functionList: ReadonlyArray<WasmFunction>
): ReadonlyArray<number> => {
  /**
   * とりあえず, すべての関数の型はTypeSectionで指定した0番にしよう
   */
  const body: ReadonlyArray<ReadonlyArray<number>> = new Array(
    functionList.length
  ).fill([0x00]);

  return sectionToWasmBinary(0x03, vectorToWasmBinary(body));
};

/**
 * エキスポートする関数を指定する
 *
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#export-section
 */
const exportSection = (
  functionList: ReadonlyArray<WasmFunction>
): ReadonlyArray<number> => {
  const binaryList: Array<ReadonlyArray<number>> = [];
  for (const [index, func] of functionList.entries()) {
    if (func.export.tag === "export") {
      binaryList.push(exportFunctionName(func.export.name, index));
    }
  }

  return sectionToWasmBinary(0x07, vectorToWasmBinary(binaryList));
};

const exportFunctionName = (
  functionName: string,
  functionIndex: number
): ReadonlyArray<number> => {
  const textEncoder = new TextEncoder();
  const digitList = textEncoder.encode(functionName);
  return [
    digitList.length,
    ...digitList,
    // 文字の終わり示す???????
    0x00,
    // エキスポートする関数の番号
    functionIndex,
  ];
};

/**
 * それぞれの関数の中身をしていする
 *
 * https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#code-section
 */
const codeSection = (
  functionList: ReadonlyArray<WasmFunction>
): ReadonlyArray<number> => {
  /**
   *  関数の定義
   */
  const body = functionList.map((func) => optToBinary(func.expr));

  return sectionToWasmBinary(0x0a, vectorToWasmBinary(body));
};

type WatLike =
  | { tag: "I32Const"; value: number }
  | { tag: "Call"; functionIndex: number }
  | { tag: "I32Add" }
  | { tag: "I32Sub" }
  | { tag: "I32Mul" };

export type Opt =
  | { tag: "I32Add"; left: Opt; right: Opt }
  | { tag: "I32Sub"; left: Opt; right: Opt }
  | { tag: "I32Mul"; left: Opt; right: Opt }
  | { tag: "I32Const"; value: number }
  | { tag: "Call"; functionIdex: number };

const optToBinary = (opt: Opt): ReadonlyArray<number> => {
  const binary = [
    0x00,
    ...optToWatLikeList(opt).flatMap(watLikeToBinary),
    0x0b,
  ];

  return [...uInt32ToBinary(binary.length), ...binary];
};

const optToWatLikeList = (opt: Opt): ReadonlyArray<WatLike> => {
  switch (opt.tag) {
    case "I32Add":
      return [
        ...optToWatLikeList(opt.left),
        ...optToWatLikeList(opt.right),
        { tag: "I32Add" },
      ];
    case "I32Sub":
      return [
        ...optToWatLikeList(opt.left),
        ...optToWatLikeList(opt.right),
        { tag: "I32Sub" },
      ];
    case "I32Mul":
      return [
        ...optToWatLikeList(opt.left),
        ...optToWatLikeList(opt.right),
        { tag: "I32Mul" },
      ];
    case "I32Const":
      return [{ tag: "I32Const", value: opt.value }];
    case "Call":
      return [{ tag: "Call", functionIndex: opt.functionIdex }];
  }
};

const watLikeToBinary = (watLike: WatLike): ReadonlyArray<number> => {
  switch (watLike.tag) {
    case "I32Const":
      return [0x41, ...uInt32ToBinary(watLike.value)];
    case "Call":
      return [0x10, ...uInt32ToBinary(watLike.functionIndex)];
    case "I32Add":
      return [0x6a];
    case "I32Sub":
      return [0x6b];
    case "I32Mul":
      return [0x6c];
  }
};

export const optToWasmBinary = (wasm: Wasm): Uint8Array => {
  return new Uint8Array([
    ...wasmBinaryMagic,
    ...wasmBinaryVersion,
    ...typeSection([
      {
        parameter: [],
        result: ["i32"],
      },
    ]),
    ...functionSection(wasm.functionList),
    ...exportSection(wasm.functionList),
    ...codeSection(wasm.functionList),
  ]);
};

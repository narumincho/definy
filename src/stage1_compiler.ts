/**
 * definy の自己記述コンパイラ (`stage1.wasm`) をブラウザ / Worker / Node.js の
 * WebAssembly ランタイム上で直接実行し、definy の式から Wasm バイナリを動的に生成するパイプライン。
 */

import { variant, variantOf, variantPayload } from "./definy_value.ts";

export type DefinyValue =
  | number
  | string
  | boolean
  | ReadonlyArray<DefinyValue>
  /** レコード. タグ付きの値は `{"#tag": payload}` (docs/value-encoding.md) */
  | { readonly [key: string]: DefinyValue }
  | {
      readonly __closure: true;
      readonly tableIdx: number;
      readonly envPtr: number;
    }
  | null;

export type Stage1CompilerInstance = {
  /**
   * 式 (`core.expression` の値) を Wasm にコンパイルする.
   * 式が参照するパーツは `referencedParts` に渡す (`collectReferencedParts` で集める)
   */
  readonly compile: (
    expressionAst: unknown,
    referencedParts?: ReadonlyArray<Stage1ReferencedPart>,
  ) => Uint8Array;
};

export type WasmExports = {
  readonly evaluate: () => number;
  readonly table: WebAssembly.Table;
  readonly memory: WebAssembly.Memory;
  readonly alloc: (size: number) => number;
};

/** 先頭 0 からの相対アドレスで書いた値 (`writeLiteral` が `alloc` した位置に合わせて写す) */
type LaidOutLiteral = {
  readonly bytes: Uint8Array;
  /** ポインタを書いた位置. 写すときに先頭のアドレスを足す */
  readonly pointerFields: Uint32Array;
  readonly root: number;
};

/** 同じオブジェクトの値 (型環境や型の宣言の一覧など) を何度も書くときに, 並べ直さずに済ませる */
const laidOutCache = new WeakMap<object, LaidOutLiteral>();

/**
 * definy の値 (docs/value-encoding.md の JSON の形) を, definy の値の形 (タグ付きの箱, 8 バイト境界) で線形メモリに書き込み, ポインタを返す.
 * 1 度だけ走査して JavaScript 側のバッファに先頭 0 からの相対アドレスで書き, `alloc` した位置に合わせて
 * ポインタを直してからまとめて写す (型環境のような大きな値を書くので速さが要る).
 * 値は書き換えられないので, 同じ文字列は 1 つの箱を共有する. オブジェクトの値は並べた結果を覚えておく
 */
function writeLiteral(exports: WasmExports, node: unknown): number {
  const laidOut =
    node !== null && typeof node === "object"
      ? (laidOutCache.get(node) ?? cacheLayout(node))
      : layoutLiteral(node);
  const base = exports.alloc(laidOut.bytes.length);
  const memory = new Uint8Array(exports.memory.buffer);
  memory.set(laidOut.bytes, base);
  const view = new DataView(exports.memory.buffer);
  for (const at of laidOut.pointerFields) {
    view.setUint32(base + at, view.getUint32(base + at, true) + base, true);
  }
  return laidOut.root + base;
}

function cacheLayout(node: object): LaidOutLiteral {
  const laidOut = layoutLiteral(node);
  laidOutCache.set(node, laidOut);
  return laidOut;
}

function layoutLiteral(node: unknown): LaidOutLiteral {
  let buffer = new Uint8Array(4096);
  let view = new DataView(buffer.buffer);
  let length = 0;
  const pointerFields: Array<number> = [];
  const encoder = new TextEncoder();
  /** 書いた文字列の箱の相対アドレス */
  const strings = new Map<string, number>();

  /** `size` バイト (8 バイト境界に揃える) を確保し, その相対アドレスを返す */
  function reserve(size: number): number {
    const at = length;
    length += Math.ceil(size / 8) * 8;
    if (length > buffer.length) {
      let nextSize = buffer.length * 2;
      while (nextSize < length) nextSize *= 2;
      const next = new Uint8Array(nextSize);
      next.set(buffer);
      buffer = next;
      view = new DataView(buffer.buffer);
    }
    return at;
  }

  function setPointer(at: number, pointer: number): void {
    view.setUint32(at, pointer, true);
    pointerFields.push(at);
  }

  function writeString(value: string): number {
    const written = strings.get(value);
    if (written !== undefined) {
      return written;
    }
    let at: number;
    if (isAscii(value)) {
      at = reserve(8 + value.length);
      for (let i = 0; i < value.length; i++) {
        buffer[at + 8 + i] = value.charCodeAt(i);
      }
      view.setUint32(at + 4, value.length, true);
    } else {
      const bytes = encoder.encode(value);
      at = reserve(8 + bytes.length);
      view.setUint32(at + 4, bytes.length, true);
      buffer.set(bytes, at + 8);
    }
    buffer[at] = 2;
    strings.set(value, at);
    return at;
  }

  function layout(n: unknown): number {
    if (typeof n === "number") {
      const at = reserve(16);
      view.setBigInt64(at + 8, BigInt(n), true);
      return at;
    }
    if (typeof n === "boolean") {
      const at = reserve(9);
      buffer[at] = 1;
      buffer[at + 8] = n ? 1 : 0;
      return at;
    }
    if (typeof n === "string") {
      return writeString(n);
    }
    if (Array.isArray(n)) {
      const itemPtrs = n.map((item) => layout(item));
      const at = reserve(8 + 4 * itemPtrs.length);
      buffer[at] = 3;
      view.setUint32(at + 4, itemPtrs.length, true);
      itemPtrs.forEach((ptr, i) => {
        setPointer(at + 8 + 4 * i, ptr);
      });
      return at;
    }
    if (!n || typeof n !== "object") {
      throw new Error(`Invalid definy value for layout: ${JSON.stringify(n)}`);
    }
    const tagged = variantOf(n);
    if (tagged !== undefined) {
      const tagPtr = writeString(tagged.tag);
      const payloadPtr =
        tagged.payload === null ? null : layout(tagged.payload);
      const at = reserve(12);
      buffer[at] = 6;
      setPointer(at + 4, tagPtr);
      if (payloadPtr !== null) {
        setPointer(at + 8, payloadPtr);
      }
      return at;
    }
    const fieldPairs = Object.entries(n as Record<string, unknown>).map(
      ([key, value]) => [writeString(key), layout(value)] as const,
    );
    const at = reserve(8 + 8 * fieldPairs.length);
    buffer[at] = 4;
    view.setUint32(at + 4, fieldPairs.length, true);
    fieldPairs.forEach(([keyPtr, valuePtr], i) => {
      setPointer(at + 8 + 8 * i, keyPtr);
      setPointer(at + 12 + 8 * i, valuePtr);
    });
    return at;
  }

  const root = layout(node);
  return {
    bytes: buffer.subarray(0, length),
    pointerFields: Uint32Array.from(pointerFields),
    root,
  };
}

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) >= 128) return false;
  }
  return true;
}

export function readDefinyValue(mem: Uint8Array, ptr: number): DefinyValue {
  if (ptr < 0 || ptr >= mem.length) return null;
  const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
  const tag = mem[ptr];
  if (tag === 0) {
    return Number(view.getBigInt64(ptr + 8, true));
  }
  if (tag === 1) {
    return mem[ptr + 8] !== 0;
  }
  if (tag === 2) {
    const len = view.getUint32(ptr + 4, true);
    return new TextDecoder().decode(mem.subarray(ptr + 8, ptr + 8 + len));
  }
  if (tag === 3) {
    const count = view.getUint32(ptr + 4, true);
    return Array.from({ length: count }, (_, i) => {
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      return readDefinyValue(mem, elemPtr);
    });
  }
  if (tag === 4) {
    const count = view.getUint32(ptr + 4, true);
    const obj: Record<string, DefinyValue> = {};
    for (let i = 0; i < count; i++) {
      const itemBase = ptr + 8 + i * 8;
      const keyPtr = view.getUint32(itemBase, true);
      const valPtr = view.getUint32(itemBase + 4, true);
      const keyStr = readDefinyValue(mem, keyPtr);
      if (typeof keyStr === "string") {
        obj[keyStr] = readDefinyValue(mem, valPtr);
      }
    }
    return obj;
  }
  if (tag === 5) {
    return {
      __closure: true,
      tableIdx: view.getUint32(ptr + 4, true),
      envPtr: view.getInt32(ptr + 8, true),
    };
  }
  if (tag === 6) {
    const tagPtr = view.getUint32(ptr + 4, true);
    const payloadPtr = view.getUint32(ptr + 8, true);
    const tagName = readDefinyValue(mem, tagPtr);
    const payloadVal =
      payloadPtr !== 0 ? readDefinyValue(mem, payloadPtr) : null;
    return variant(String(tagName), payloadVal) as DefinyValue;
  }
  return null;
}

/**
 * `core.compile-to-wasm` に渡す, 式が参照するパーツ.
 * `id` は式の `part_reference` の ID (URL-safe Base64), `expression` は `core.expression` の値
 */
export type Stage1ReferencedPart = {
  readonly id: string;
  readonly expression: unknown;
};

/** 式を stage1 に渡せないときのエラー (未入力のある式・型パーツの宣言式など) */
export class SelfHostedAstConversionError extends Error {
  override readonly name = "SelfHostedAstConversionError";
}

/**
 * コンパイラ組み込みのパーツの式 (`{"#builtin": "plus"}`) の名前 (`plus`). 組み込みでなければ `undefined`
 */
export function compilerBuiltinName(expression: unknown): string | undefined {
  const name = variantPayload(expression, "builtin");
  return typeof name === "string" ? name : undefined;
}

/**
 * コンパイラ組み込みのパーツの名前 (`{"#builtin": "plus"}` の `plus`) と引数名 (順番どおり).
 * 呼び出しの検査・コンパイル・評価は definy 側 (`core.builtin-parameters`, `core.compile-builtin-call` など) がする.
 * TypeScript 側では型の無い組み込み (`core.equal` など) の引数名を UI で出すのに使う
 */
export const BUILTIN_PARAMETERS: ReadonlyMap<
  string,
  ReadonlyArray<string>
> = new Map<string, ReadonlyArray<string>>([
  ...[
    "plus",
    "minus",
    "multiply",
    "divide",
    "remainder",
    "equal",
    "not_equal",
    "less_than",
    "less_than_or_equal",
    "greater_than",
    "greater_than_or_equal",
    "and",
    "or",
    "string_concat",
    "list_concat",
  ].map((name): readonly [string, ReadonlyArray<string>] => [
    name,
    ["left", "right"],
  ]),
  ...["not", "string_length", "string_to_bytes", "list_length"].map(
    (name): readonly [string, ReadonlyArray<string>] => [name, ["value"]],
  ),
  ["string_slice", ["value", "start", "end"]],
  ["list_get", ["list", "index"]],
  ["list_append", ["list", "item"]],
]);

/** 式 (`core.expression` の値) に未入力 (`hole`) があるか */
export function containsHole(expression: unknown): boolean {
  if (Array.isArray(expression)) {
    return expression.some(containsHole);
  }
  if (!expression || typeof expression !== "object") {
    return false;
  }
  if (variantOf(expression)?.tag === "hole") {
    return true;
  }
  return Object.values(expression).some(containsHole);
}

/** 型パーツの宣言式 (`type_union` など, `type_` で始まるタグの式) か */
export function isTypeDeclaration(expression: unknown): boolean {
  return variantOf(expression)?.tag.startsWith("type_") === true;
}

/**
 * 式を stage1 (`core.compile-to-wasm`) に渡せるか確かめる. 未入力のある式はコンパイルできないので
 * `SelfHostedAstConversionError` を投げる
 */
function assertCompilable(expression: unknown): unknown {
  if (containsHole(expression)) {
    throw new SelfHostedAstConversionError("Expression has an unfilled hole");
  }
  return expression;
}

/** 式の中の `part_reference` の ID を出現順に集める */
export function collectPartReferenceIds(
  expression: unknown,
): ReadonlyArray<string> {
  const references: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const reference = variantPayload(value, "part_reference") as
      { readonly part_definition_event_hash?: unknown } | undefined;
    if (
      reference &&
      typeof reference === "object" &&
      typeof reference.part_definition_event_hash === "string"
    ) {
      references.push(reference.part_definition_event_hash);
    }
    Object.values(value).forEach(walk);
  };
  walk(expression);
  return references;
}

/**
 * 式が (参照先をたどって) 参照するパーツを集める.
 * 末尾から取り出す LIFO の順序。stage1 を作ったときと同じ順序で, `wasm/stage1.wasm` の再生成でバイト一致させるために必要。
 * `resolve` は ID からパーツの式 (`core.expression` の値) を返す. 見つからない・式を持たないときは `undefined`.
 * 見つからない・式を持たない・型パーツの宣言式・未入力のあるパーツの ID は `unresolved` に入れる
 * (stage1 はその参照を unreachable にコンパイルする).
 * コンパイラ組み込みのパーツ (`core.plus` など) も式 (`core.expression` の `builtin`) のまま入れる
 */
export function collectReferencedParts(
  expression: unknown,
  resolve: (id: string) => unknown,
): {
  readonly parts: ReadonlyArray<Stage1ReferencedPart>;
  readonly unresolved: ReadonlyArray<string>;
} {
  let queue: ReadonlyArray<string> = collectPartReferenceIds(expression);
  const seen = new Set<string>();
  const parts: Stage1ReferencedPart[] = [];
  const unresolved: string[] = [];
  while (queue.length > 0) {
    const id = queue[queue.length - 1];
    queue = queue.slice(0, -1);
    if (id === undefined || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const partExpression = resolve(id);
    if (
      partExpression == null ||
      isTypeDeclaration(partExpression) ||
      containsHole(partExpression)
    ) {
      unresolved.push(id);
      continue;
    }
    queue = [...queue, ...collectPartReferenceIds(partExpression)];
    parts.push({ id, expression: partExpression });
  }
  return { parts, unresolved };
}

/** stage1 (`core.compile-to-wasm`) に渡すパーツの一覧 `[{ id, expression }]` */
export function stage1PartsValue(
  parts: ReadonlyArray<Stage1ReferencedPart>,
): unknown {
  return parts.map((part) => ({
    id: part.id,
    expression: assertCompilable(part.expression),
  }));
}

/** stage1 でコンパイルした式の Wasm のインスタンスと, `evaluate()` の結果の値 */
export type CompiledValueInstance = {
  readonly exports: WasmExports;
  /** `evaluate()` が返した値のポインタ */
  readonly root: number;
  /**
   * definy の値 (docs/value-encoding.md の JSON の形) を
   * 線形メモリに書き込み, その値のポインタを返す. 同じ値を何度も渡すときは 1 度だけ書けばよい
   */
  readonly writeArgument: (literal: unknown) => number;
  /**
   * 関数の値のポインタを, 引数の順に並べたポインタで呼び, 結果のポインタを返す.
   * 関数でなければ例外を投げる
   */
  readonly callClosure: (
    closurePointer: number,
    argumentPointers: ReadonlyArray<number>,
  ) => number;
  /**
   * レコードの値のポインタから, フィールド `key` の値のポインタを返す (関数の値のフィールドを
   * `callClosure` で呼ぶときなど). レコードでないかフィールドが無ければ例外を投げる
   */
  readonly recordField: (recordPointer: number, key: string) => number;
  /**
   * タグ付きの値 (Variant) のポインタから, タグとペイロードのポインタ (無ければ `null`) を返す.
   * タグ付きの値でなければ例外を投げる
   */
  readonly variant: (pointer: number) => {
    readonly tag: string;
    readonly payload: number | null;
  };
  /** 結果のポインタを JavaScript の値として読む */
  readonly read: (pointer: number) => DefinyValue;
};

/**
 * stage1 でコンパイルした式の Wasm を新しいインスタンスで評価し, 値をポインタのまま扱えるようにする.
 * 線形メモリは解放しないので, 呼び出しが多いときや Wasm が trap したときは作り直す
 */
export function instantiateCompiledValue(
  module: WebAssembly.Module,
): CompiledValueInstance {
  const instance = new WebAssembly.Instance(module, {});
  const exports = instance.exports as unknown as WasmExports;

  const callClosure = (
    closurePtr: number,
    argumentPointers: ReadonlyArray<number>,
  ): number => {
    const view = new DataView(exports.memory.buffer);
    const tag = view.getUint8(closurePtr);
    if (tag !== 5) {
      throw new Error(`the value is not a function closure (tag: ${tag})`);
    }
    const fn = exports.table.get(view.getUint32(closurePtr + 4, true)) as (
      env: number,
      args: number,
    ) => number;
    const envPtr = view.getInt32(closurePtr + 8, true);
    const argsPtr = exports.alloc(Math.max(4 * argumentPointers.length, 8));
    const argsView = new DataView(exports.memory.buffer);
    argumentPointers.forEach((ptr, i) => {
      argsView.setUint32(argsPtr + 4 * i, ptr, true);
    });
    return fn(envPtr, argsPtr);
  };

  return {
    exports,
    root: exports.evaluate(),
    writeArgument: (literal) => writeLiteral(exports, literal),
    callClosure,
    recordField: (recordPtr, key) => {
      const mem = new Uint8Array(exports.memory.buffer);
      const view = new DataView(exports.memory.buffer);
      if (mem[recordPtr] !== 4) {
        throw new Error(`the value is not a record (tag: ${mem[recordPtr]})`);
      }
      const count = view.getUint32(recordPtr + 4, true);
      for (let i = 0; i < count; i++) {
        const itemBase = recordPtr + 8 + i * 8;
        if (readDefinyValue(mem, view.getUint32(itemBase, true)) === key) {
          return view.getUint32(itemBase + 4, true);
        }
      }
      throw new Error(`the record has no field '${key}'`);
    },
    variant: (pointer) => {
      const mem = new Uint8Array(exports.memory.buffer);
      const view = new DataView(exports.memory.buffer);
      if (mem[pointer] !== 6) {
        throw new Error(`the value is not a variant (tag: ${mem[pointer]})`);
      }
      const payload = view.getUint32(pointer + 8, true);
      return {
        tag: String(readDefinyValue(mem, view.getUint32(pointer + 4, true))),
        payload: payload === 0 ? null : payload,
      };
    },
    read: (pointer) =>
      readDefinyValue(new Uint8Array(exports.memory.buffer), pointer),
  };
}

/** stage1 でコンパイルした「関数を返す式」の Wasm のインスタンスと, 返った関数 */
export type CompiledFunctionInstance = CompiledValueInstance & {
  /** 関数を引数の順に並べたポインタで呼び, 結果のポインタを返す */
  readonly call: (argumentPointers: ReadonlyArray<number>) => number;
};

/**
 * stage1 でコンパイルした「関数を返す式」の Wasm を新しいインスタンスで評価し, 返った関数を呼べるようにする.
 * 型チェッカーのように 1 度コンパイルして何度も呼ぶものに使う.
 * 線形メモリは解放しないので, 呼び出しが多いときや Wasm が trap したときは作り直す
 */
export function instantiateCompiledFunction(
  module: WebAssembly.Module,
): CompiledFunctionInstance {
  const instance = instantiateCompiledValue(module);
  const tag = new DataView(instance.exports.memory.buffer).getUint8(
    instance.root,
  );
  if (tag !== 5) {
    throw new Error(
      `compiled wasm evaluate() did not return a function closure (tag: ${tag})`,
    );
  }
  return {
    ...instance,
    call: (argumentPointers) =>
      instance.callClosure(instance.root, argumentPointers),
  };
}

export function createStage1Compiler(
  stage1Module: WebAssembly.Module,
): Stage1CompilerInstance {
  return {
    compile(
      expressionAst: unknown,
      referencedParts: ReadonlyArray<Stage1ReferencedPart> = [],
    ): Uint8Array {
      const effectiveExpr = assertCompilable(expressionAst);
      const partsNode = stage1PartsValue(referencedParts);

      const instance = instantiateCompiledFunction(stage1Module);
      const { exports } = instance;
      const resultPtr = instance.call([
        instance.writeArgument(effectiveExpr),
        instance.writeArgument(partsNode),
      ]);

      const resultView = new DataView(exports.memory.buffer);
      const resultTag = resultView.getUint8(resultPtr);
      if (resultTag !== 3) {
        throw new Error(
          `stage1.wasm did not return a list of bytes (tag: ${resultTag})`,
        );
      }
      const resultCount = resultView.getUint32(resultPtr + 4, true);
      const emittedWasm = new Uint8Array(resultCount);
      for (let i = 0; i < resultCount; i++) {
        const itemPtr = resultView.getUint32(resultPtr + 8 + i * 4, true);
        const byteVal = Number(resultView.getBigInt64(itemPtr + 8, true));
        emittedWasm[i] = byteVal;
      }
      return emittedWasm;
    },
  };
}

export async function evaluateCompiledWasm(
  wasmBytes: Uint8Array,
): Promise<DefinyValue> {
  const module = await WebAssembly.compile(
    wasmBytes as unknown as BufferSource,
  );
  const instance = await WebAssembly.instantiate(module, {});
  const exports = instance.exports as {
    readonly evaluate: () => number;
    readonly memory: WebAssembly.Memory;
  };
  const valPtr = exports.evaluate();
  const mem = new Uint8Array(exports.memory.buffer);
  return readDefinyValue(mem, valPtr);
}

/**
 * definy の自己記述コンパイラ (`stage1.wasm`) をブラウザ / Worker / Node.js の
 * WebAssembly ランタイム上で直接実行し、definy の式から Wasm バイナリを動的に生成するパイプライン。
 *
 * stage1 の出力は Wasm GC のモジュールで, 値は GC のヒープの struct / array (docs/self-hosting.md「値の表現」).
 * JavaScript からは中を覗けない参照 ({@link ValueRef}) なので, モジュールがエクスポートするランタイム関数
 * (`box_number`, `values_get` など) で値を作って読む
 */

import { variant, variantOf, variantPayload } from "./definy_value.ts";

declare const valueRefBrand: unique symbol;

/** stage1 でコンパイルした Wasm の中の definy の値への参照 (GC のヒープの struct) */
export type ValueRef = { readonly [valueRefBrand]: true };

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

/** 値の配列 (`core.wasm-type-values`) への参照 */
type ValuesRef = { readonly [valueRefBrand]: "values" };

/** stage1 でコンパイルした Wasm のエクスポート (`core.wasm-runtime-exports`) */
export type WasmExports = {
  readonly evaluate: () => ValueRef;
  readonly table: WebAssembly.Table;
  /** 文字列を渡すための置き場. 値は GC のヒープにある */
  readonly memory: WebAssembly.Memory;
  readonly string_from_memory: (length: number) => ValueRef;
  readonly string_to_memory: (value: ValueRef) => number;
  readonly box_number: (value: bigint) => ValueRef;
  readonly box_bool: (value: number) => ValueRef;
  readonly float_new: (value: number) => ValueRef;
  readonly value_tag: (value: ValueRef) => number;
  readonly number_value: (value: ValueRef) => bigint;
  readonly float_value: (value: ValueRef) => number;
  readonly bool_value: (value: ValueRef) => number;
  readonly values_of: (value: ValueRef) => ValuesRef | null;
  readonly values_length: (values: ValuesRef) => number;
  readonly values_get: (values: ValuesRef, index: number) => ValueRef | null;
  readonly values_new: (length: number) => ValuesRef;
  readonly values_set: (
    values: ValuesRef,
    index: number,
    value: ValueRef | null,
  ) => void;
  readonly list_new: (values: ValuesRef) => ValueRef;
  readonly record_new: (values: ValuesRef) => ValueRef;
  readonly variant_new: (tag: ValueRef, payload: ValueRef | null) => ValueRef;
  readonly variant_tag: (value: ValueRef) => ValueRef;
  readonly variant_payload: (value: ValueRef) => ValueRef | null;
  readonly closure_index: (value: ValueRef) => number;
};

/** 値の種類のタグ (`core.wasm-runtime-value-tag`) */
const TAG = {
  number: 0,
  boolean: 1,
  string: 2,
  list: 3,
  record: 4,
  closure: 5,
  variant: 6,
  float: 7,
} as const;

/**
 * 書き込んだオブジェクトの値 (型環境や型の宣言の一覧など) の参照. 値は書き換えられず,
 * Wasm GC の型はモジュールをまたいで同じ構造なら同じ型なので, 別のインスタンスにもそのまま渡せる
 */
const writtenCache = new WeakMap<object, ValueRef>();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** 文字列を `memory` の 0 番地から書いて, その文字列の値を作る */
function writeString(exports: WasmExports, value: string): ValueRef {
  // UTF-8 は 1 文字 (UTF-16 の 1 単位) 3 バイトまで
  const maxBytes = value.length * 3;
  const memory = exports.memory;
  if (memory.buffer.byteLength < maxBytes) {
    memory.grow(Math.ceil((maxBytes - memory.buffer.byteLength) / 65536));
  }
  const { written } = encoder.encodeInto(
    value,
    new Uint8Array(memory.buffer, 0, maxBytes),
  );
  return exports.string_from_memory(written);
}

function readString(exports: WasmExports, value: ValueRef): string {
  const length = exports.string_to_memory(value);
  return decoder.decode(new Uint8Array(exports.memory.buffer, 0, length));
}

/**
 * definy の値 (docs/value-encoding.md の JSON の形) を Wasm の値にする.
 * 同じ文字列は 1 つの値を共有し, オブジェクトの値は作った参照を覚えておく (値は書き換えられない)
 */
function writeLiteral(exports: WasmExports, node: unknown): ValueRef {
  const strings = new Map<string, ValueRef>();
  const string = (value: string): ValueRef => {
    const written = strings.get(value);
    if (written !== undefined) {
      return written;
    }
    const ref = writeString(exports, value);
    strings.set(value, ref);
    return ref;
  };
  const values = (items: ReadonlyArray<ValueRef | null>): ValuesRef => {
    const array = exports.values_new(items.length);
    items.forEach((item, i) => {
      exports.values_set(array, i, item);
    });
    return array;
  };
  const write = (n: unknown): ValueRef => {
    if (typeof n === "number") {
      // 整数でない数 (NaN と ±Infinity を含む) は浮動小数 (タグ 7) にする
      return Number.isInteger(n)
        ? exports.box_number(BigInt(n))
        : exports.float_new(n);
    }
    if (typeof n === "boolean") {
      return exports.box_bool(n ? 1 : 0);
    }
    if (typeof n === "string") {
      return string(n);
    }
    if (!n || typeof n !== "object") {
      throw new Error(`Invalid definy value for layout: ${JSON.stringify(n)}`);
    }
    const cached = writtenCache.get(n);
    if (cached !== undefined) {
      return cached;
    }
    let ref: ValueRef;
    if (Array.isArray(n)) {
      ref = exports.list_new(values(n.map(write)));
    } else {
      const tagged = variantOf(n);
      if (tagged !== undefined) {
        ref = exports.variant_new(
          string(tagged.tag),
          tagged.payload === null ? null : write(tagged.payload),
        );
      } else {
        ref = exports.record_new(
          values(
            Object.entries(n as Record<string, unknown>).flatMap(
              ([key, value]) => [string(key), write(value)],
            ),
          ),
        );
      }
    }
    writtenCache.set(n, ref);
    return ref;
  };
  return write(node);
}

function valuesOf(exports: WasmExports, value: ValueRef): Array<ValueRef> {
  const array = exports.values_of(value);
  if (array === null) {
    return [];
  }
  const length = exports.values_length(array);
  const items: Array<ValueRef> = [];
  for (let i = 0; i < length; i++) {
    items.push(exports.values_get(array, i) as ValueRef);
  }
  return items;
}

/** Wasm の値を JavaScript の値 (docs/value-encoding.md の JSON の形) として読む */
export function readDefinyValue(
  exports: WasmExports,
  value: ValueRef | null,
): DefinyValue {
  if (value === null) {
    return null;
  }
  switch (exports.value_tag(value)) {
    case TAG.number:
      return Number(exports.number_value(value));
    case TAG.boolean:
      return exports.bool_value(value) !== 0;
    case TAG.float:
      return exports.float_value(value);
    case TAG.string:
      return readString(exports, value);
    case TAG.list:
      return valuesOf(exports, value).map((item) =>
        readDefinyValue(exports, item),
      );
    case TAG.record: {
      const items = valuesOf(exports, value);
      const obj: Record<string, DefinyValue> = {};
      for (let i = 0; i + 1 < items.length; i += 2) {
        obj[readString(exports, items[i] as ValueRef)] = readDefinyValue(
          exports,
          items[i + 1] ?? null,
        );
      }
      return obj;
    }
    case TAG.closure:
      return { __closure: true, tableIdx: exports.closure_index(value) };
    case TAG.variant:
      return variant(
        readString(exports, exports.variant_tag(value)),
        readDefinyValue(exports, exports.variant_payload(value)),
      ) as DefinyValue;
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
  ...[
    "float_plus",
    "float_minus",
    "float_multiply",
    "float_divide",
    "float_less_than",
    "float_less_than_or_equal",
  ].map((name): readonly [string, ReadonlyArray<string>] => [
    name,
    ["left", "right"],
  ]),
  ...[
    "float_from_integer",
    "float_floor",
    "float_ceiling",
    "float_truncate",
    "float_square_root",
  ].map((name): readonly [string, ReadonlyArray<string>] => [name, ["value"]]),
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
 * 見つからない・式を持たない・未入力のあるパーツの ID は `unresolved` に入れる
 * (stage1 はその参照を unreachable にコンパイルする). 型パーツは宣言式のまま入れるが, その先はたどらない.
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
    if (partExpression == null || containsHole(partExpression)) {
      unresolved.push(id);
      continue;
    }
    // 型パーツ (式が型の宣言) は実行時には参照のままの値になる (`core.type-expression-construct`) ので,
    // 宣言の中で参照するパーツはたどらない
    if (isTypeDeclaration(partExpression)) {
      parts.push({ id, expression: partExpression });
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
  /** `evaluate()` が返した値 */
  readonly root: ValueRef;
  /**
   * definy の値 (docs/value-encoding.md の JSON の形) を Wasm の値にする.
   * 同じオブジェクトの値を何度も渡すときは, 2 回目から作った値を使い回す
   */
  readonly writeArgument: (literal: unknown) => ValueRef;
  /**
   * 関数の値を, 引数を名前の順に並べた値で呼び, 結果の値を返す.
   * 引数が 2 つ以上なら {@link argumentsByName} で並べる. 関数でなければ例外を投げる
   */
  readonly callClosure: (
    closure: ValueRef,
    argumentValues: ReadonlyArray<ValueRef>,
  ) => ValueRef;
  /**
   * レコードの値から, フィールド `key` の値を返す (関数の値のフィールドを
   * `callClosure` で呼ぶときなど). レコードでないかフィールドが無ければ例外を投げる
   */
  readonly recordField: (record: ValueRef, key: string) => ValueRef;
  /**
   * タグ付きの値 (Variant) から, タグとペイロード (無ければ `null`) を返す.
   * タグ付きの値でなければ例外を投げる
   */
  readonly variant: (value: ValueRef) => {
    readonly tag: string;
    readonly payload: ValueRef | null;
  };
  /** 値を JavaScript の値として読む */
  readonly read: (value: ValueRef) => DefinyValue;
};

/**
 * stage1 でコンパイルした式の Wasm を新しいインスタンスで評価し, 値を参照のまま扱えるようにする.
 * 使わなくなった値は GC が回収するので, 1 つのインスタンスを何度呼んでもよい
 */
export function instantiateCompiledValue(
  module: WebAssembly.Module,
): CompiledValueInstance {
  const instance = new WebAssembly.Instance(module, {});
  const exports = instance.exports as unknown as WasmExports;

  const callClosure = (
    closure: ValueRef,
    argumentValues: ReadonlyArray<ValueRef>,
  ): ValueRef => {
    const tag = exports.value_tag(closure);
    if (tag !== TAG.closure) {
      throw new Error(`the value is not a function closure (tag: ${tag})`);
    }
    const fn = exports.table.get(exports.closure_index(closure)) as (
      env: ValuesRef | null,
      args: ValuesRef | null,
    ) => ValueRef;
    const args = exports.values_new(argumentValues.length);
    argumentValues.forEach((value, i) => {
      exports.values_set(args, i, value);
    });
    return fn(exports.values_of(closure), args);
  };

  return {
    exports,
    root: exports.evaluate(),
    writeArgument: (literal) => writeLiteral(exports, literal),
    callClosure,
    recordField: (record, key) => {
      const tag = exports.value_tag(record);
      if (tag !== TAG.record) {
        throw new Error(`the value is not a record (tag: ${tag})`);
      }
      const items = valuesOf(exports, record);
      for (let i = 0; i + 1 < items.length; i += 2) {
        if (readString(exports, items[i] as ValueRef) === key) {
          return items[i + 1] as ValueRef;
        }
      }
      throw new Error(`the record has no field '${key}'`);
    },
    variant: (value) => {
      const tag = exports.value_tag(value);
      if (tag !== TAG.variant) {
        throw new Error(`the value is not a variant (tag: ${tag})`);
      }
      return {
        tag: readString(exports, exports.variant_tag(value)),
        payload: exports.variant_payload(value),
      };
    },
    read: (value) => readDefinyValue(exports, value),
  };
}

/**
 * 引数名 → 値を, 実行時に関数へ渡す順 (引数名の UTF-8 のバイト列の辞書順) に並べる.
 * definy の呼び出しは引数を名前で対応させ, 宣言の順とは関係なく名前の順で渡す (`core.call-argument-rank`)
 */
export function argumentsByName(
  args: Readonly<Record<string, ValueRef>>,
): ReadonlyArray<ValueRef> {
  return Object.entries(args)
    .map(([name, value]) => ({ bytes: encoder.encode(name), value }))
    .sort((a, b) => compareBytes(a.bytes, b.bytes))
    .map(({ value }) => value);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return a.length - b.length;
}

/** stage1 でコンパイルした「関数を返す式」の Wasm のインスタンスと, 返った関数 */
export type CompiledFunctionInstance = CompiledValueInstance & {
  /** 関数を引数名 → 値で呼び, 結果の値を返す */
  readonly call: (args: Readonly<Record<string, ValueRef>>) => ValueRef;
};

/**
 * stage1 でコンパイルした「関数を返す式」の Wasm を新しいインスタンスで評価し, 返った関数を呼べるようにする.
 * 型チェッカーのように 1 度コンパイルして何度も呼ぶものに使う
 */
export function instantiateCompiledFunction(
  module: WebAssembly.Module,
): CompiledFunctionInstance {
  const instance = instantiateCompiledValue(module);
  const tag = instance.exports.value_tag(instance.root);
  if (tag !== TAG.closure) {
    throw new Error(
      `compiled wasm evaluate() did not return a function closure (tag: ${tag})`,
    );
  }
  return {
    ...instance,
    call: (args) => instance.callClosure(instance.root, argumentsByName(args)),
  };
}

/** 数値のリストの値をバイト列として読む (stage1 の出力の Wasm) */
function readByteList(exports: WasmExports, list: ValueRef): Uint8Array {
  const tag = exports.value_tag(list);
  if (tag !== TAG.list) {
    throw new Error(`stage1.wasm did not return a list of bytes (tag: ${tag})`);
  }
  const array = exports.values_of(list);
  if (array === null) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(exports.values_length(array));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number(
      exports.number_value(exports.values_get(array, i) as ValueRef),
    );
  }
  return bytes;
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
      const result = instance.call({
        expr: instance.writeArgument(effectiveExpr),
        parts: instance.writeArgument(partsNode),
      });
      return readByteList(instance.exports, result);
    },
  };
}

export async function evaluateCompiledWasm(
  wasmBytes: Uint8Array,
): Promise<DefinyValue> {
  const module = await WebAssembly.compile(
    wasmBytes as unknown as BufferSource,
  );
  const instance = instantiateCompiledValue(module);
  return instance.read(instance.root);
}

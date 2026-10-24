/**
 * definy の自己記述コンパイラ (`stage1.wasm`) をブラウザ / Worker / Node.js の
 * WebAssembly ランタイム上で直接実行し、definy の式から Wasm バイナリを動的に生成するパイプライン。
 */

import { bytesToUrlSafeBase64NoPad, toUint8Array } from "./cbor.ts";
import {
  selfHostedList,
  selfHostedNumber,
  selfHostedRecord,
  selfHostedString,
  selfHostedVariant,
} from "./self_hosted_ast.ts";

export type DefinyValue =
  | number
  | string
  | boolean
  | ReadonlyArray<DefinyValue>
  | { readonly [key: string]: DefinyValue }
  | { readonly tag: string; readonly payload: DefinyValue | null }
  | {
      readonly __closure: true;
      readonly tableIdx: number;
      readonly envPtr: number;
    }
  | null;

export type Stage1CompilerInstance = {
  /**
   * definy の JSON AST の式を Wasm にコンパイルする.
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

/**
 * リテラルの式の木を, definy の値の形 (タグ付きの箱, 8 バイト境界) で線形メモリに書き込み, ポインタを返す.
 * 1 度だけ走査して JavaScript 側のバッファに先頭 0 からの相対アドレスで書き, `alloc` した位置に合わせて
 * ポインタを直してからまとめて写す (型環境のような大きな値を書くので速さが要る)
 */
function writeLiteral(exports: WasmExports, node: unknown): number {
  let buffer = new Uint8Array(4096);
  let view = new DataView(buffer.buffer);
  let length = 0;
  /** ポインタを書いた位置. 最後に先頭のアドレスを足す */
  const pointerFields: Array<number> = [];
  const encoder = new TextEncoder();

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
    const bytes = encoder.encode(value);
    const at = reserve(8 + bytes.length);
    buffer[at] = 2;
    view.setUint32(at + 4, bytes.length, true);
    buffer.set(bytes, at + 8);
    return at;
  }

  function layout(n: unknown): number {
    if (!n || typeof n !== "object") {
      throw new Error(`Invalid AST node for layout: ${JSON.stringify(n)}`);
    }
    const obj = n as Record<string, unknown>;

    if (obj.Variant) {
      const v = obj.Variant as {
        readonly tag: string;
        readonly payload?: unknown;
      };
      const tagPtr = writeString(v.tag);
      const payloadPtr = v.payload ? layout(v.payload) : null;
      const at = reserve(12);
      buffer[at] = 6;
      setPointer(at + 4, tagPtr);
      if (payloadPtr !== null) {
        setPointer(at + 8, payloadPtr);
      }
      return at;
    }
    if (obj.Number) {
      const num = obj.Number as { readonly value: number };
      const at = reserve(16);
      view.setBigInt64(at + 8, BigInt(num.value), true);
      return at;
    }
    if (obj.Boolean) {
      const b = obj.Boolean as { readonly value: boolean };
      const at = reserve(9);
      buffer[at] = 1;
      buffer[at + 8] = b.value ? 1 : 0;
      return at;
    }
    if (obj.String) {
      const str = obj.String as { readonly value: string };
      return writeString(str.value);
    }
    if (obj.ListLiteral) {
      const list = obj.ListLiteral as {
        readonly items: ReadonlyArray<unknown>;
      };
      const itemPtrs = list.items.map((item) => layout(item));
      const at = reserve(8 + 4 * itemPtrs.length);
      buffer[at] = 3;
      view.setUint32(at + 4, itemPtrs.length, true);
      itemPtrs.forEach((ptr, i) => {
        setPointer(at + 8 + 4 * i, ptr);
      });
      return at;
    }
    if (obj.TypeLiteral) {
      const record = obj.TypeLiteral as {
        readonly items: ReadonlyArray<{
          readonly key: string;
          readonly value: unknown;
        }>;
      };
      const fieldPairs = record.items.map(
        (it) => [writeString(it.key), layout(it.value)] as const,
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
    throw new Error(`Unsupported literal node in layout: ${JSON.stringify(n)}`);
  }

  const root = layout(node);
  const base = exports.alloc(length);
  for (const at of pointerFields) {
    view.setUint32(at, view.getUint32(at, true) + base, true);
  }
  new Uint8Array(exports.memory.buffer).set(buffer.subarray(0, length), base);
  return root + base;
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
    return { tag: String(tagName), payload: payloadVal };
  }
  return null;
}

/**
 * `core.compile-to-wasm` に渡す, 式が参照するパーツ.
 * `id` は式の `PartReference` の ID (URL-safe Base64), `expression` は definy の JSON AST
 */
export type Stage1ReferencedPart = {
  readonly id: string;
  readonly expression: unknown;
};

/** definy の式を `core.expression` の値で表せないときのエラー */
export class SelfHostedAstConversionError extends Error {
  override readonly name = "SelfHostedAstConversionError";
}

/**
 * `PartReference.part_definition_event_hash` (CBOR 由来のバイト列, seed 由来の数値配列, 文字列) を
 * stage1 が比較に使う文字列 ID (URL-safe Base64) にする
 */
export function partReferenceId(hash: unknown): string {
  if (typeof hash === "string") {
    return hash;
  }
  const bytes = toUint8Array(hash);
  if (bytes === undefined) {
    throw new SelfHostedAstConversionError(
      `Invalid part reference hash: ${JSON.stringify(hash)}`,
    );
  }
  return bytesToUrlSafeBase64NoPad(bytes);
}

/**
 * コンパイラ組み込みのパーツの式 (`{"Compiler": "plus"}`) の名前 (`plus`). 組み込みでなければ `undefined`
 */
export function compilerBuiltinName(expression: unknown): string | undefined {
  if (typeof expression !== "object" || expression === null) {
    return undefined;
  }
  const name = (expression as { readonly Compiler?: unknown }).Compiler;
  return typeof name === "string" ? name : undefined;
}

/**
 * コンパイラ組み込みのパーツの名前 (`{"Compiler": "plus"}` の `plus`) と引数名 (順番どおり).
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

/**
 * definy の JSON AST (`{"Call": {...}}` など) を, stage1 (`core.compile-to-wasm`) が受け取る
 * `core.expression` の値 (`Variant` / `TypeLiteral` / `ListLiteral` などのリテラルの木) に変換する.
 * 旧 Rust 版 `definy_core::self_hosted_ast::expression_to_self_hosted_ast` の移植.
 * コンパイラ組み込みのパーツの式 (`{"Compiler": "plus"}`) は `builtin("plus")` にし, その呼び出しは他のパーツの呼び出しと
 * 同じく `call` にする (組み込みの扱いは definy 側). `core.expression` で表せない式 (型の式・未入力) は
 * `SelfHostedAstConversionError` を投げる
 */
export function definyAstToSelfHostedAst(ast: unknown): unknown {
  return toSelfHostedAst(ast, false);
}

/**
 * {@link definyAstToSelfHostedAst} と同じだが, 未入力 (`Hole`) を `core.expression` の `hole({ probe: false })` にする.
 * `{"Hole": {"probe": true}}` は `hole({ probe: true })` になり, 型チェッカーはその位置で期待する型を
 * `hole_expected_type` のエラーで返す (`findExpectedType`, `src/self_hosted_type_check.ts`).
 * 未入力のある式はコンパイルできないので, 型検査で期待する型を調べるときにだけ使う
 */
export function definyAstWithHolesToSelfHostedAst(ast: unknown): unknown {
  return toSelfHostedAst(ast, true);
}

function holeToSelfHostedAst(hole: unknown, allowHoles: boolean): unknown {
  if (!allowHoles) {
    throw new SelfHostedAstConversionError("Expression has an unfilled hole");
  }
  const probe =
    typeof hole === "object" &&
    hole !== null &&
    (hole as { readonly probe?: unknown }).probe === true;
  return selfHostedVariant(
    "hole",
    selfHostedRecord([["probe", { Boolean: { value: probe } }]]),
  );
}

function toSelfHostedAst(ast: unknown, allowHoles: boolean): unknown {
  if (ast === "Hole") {
    return holeToSelfHostedAst(undefined, allowHoles);
  }
  if (!ast || typeof ast !== "object") {
    throw new SelfHostedAstConversionError(
      `Invalid expression: ${JSON.stringify(ast)}`,
    );
  }
  const obj = ast as Record<string, unknown>;
  const key = Object.keys(obj)[0] ?? "";
  const node = obj[key] as Record<string, unknown>;
  const convert = (child: unknown): unknown =>
    toSelfHostedAst(child, allowHoles);

  switch (key) {
    case "Number":
      return selfHostedVariant("number", selfHostedNumber(Number(node.value)));
    case "String":
      return selfHostedVariant("string", selfHostedString(String(node.value)));
    case "Boolean":
      return selfHostedVariant("boolean", {
        Boolean: { value: node.value === true },
      });
    case "Variable":
      return selfHostedVariant(
        "variable",
        selfHostedRecord([
          ["variable_id", selfHostedNumber(Number(node.variable_id))],
        ]),
      );
    case "ListLiteral":
      return selfHostedVariant(
        "list",
        selfHostedList(
          (node.items as ReadonlyArray<unknown>).map((item) => convert(item)),
        ),
      );
    case "TypeLiteral":
      return selfHostedVariant(
        "record",
        selfHostedList(
          (
            node.items as ReadonlyArray<{
              readonly key: string;
              readonly value: unknown;
            }>
          ).map((item) =>
            selfHostedRecord([
              ["key", selfHostedString(item.key)],
              ["value", convert(item.value)],
            ]),
          ),
        ),
      );
    case "RecordGet":
      return selfHostedVariant(
        "record_get",
        selfHostedRecord([
          ["record", convert(node.record)],
          ["key", selfHostedString(String(node.key))],
        ]),
      );
    case "Variant":
      return selfHostedVariant(
        "variant",
        selfHostedRecord([
          ["tag", selfHostedString(String(node.tag))],
          [
            "payload",
            node.payload == null
              ? selfHostedVariant("none")
              : selfHostedVariant("some", convert(node.payload)),
          ],
          // 型パーツを指定した Variant は, 型チェッカーがその型パーツの型と推論する
          [
            "type_part",
            node.type_part_definition_event_hash == null
              ? selfHostedVariant("none")
              : selfHostedVariant(
                  "some",
                  selfHostedString(
                    partReferenceId(node.type_part_definition_event_hash),
                  ),
                ),
          ],
        ]),
      );
    case "Match": {
      // ペイロードを束縛しないアーム (Bool の true / false など) は参照されない変数 ID として -1 を使う.
      // default アームは, どのタグにも一致するワイルドカードアーム `_` として表す
      const arms = (
        node.arms as ReadonlyArray<{
          readonly tag: string;
          readonly variable_id?: number | null;
          readonly body: unknown;
        }>
      ).map((arm) => [arm.tag, arm.variable_id ?? -1, arm.body] as const);
      const allArms =
        node.default == null
          ? arms
          : [...arms, ["_", -1, node.default] as const];
      return selfHostedVariant(
        "match",
        selfHostedRecord([
          ["target", convert(node.target)],
          [
            "arms",
            selfHostedList(
              allArms.map(([tag, variableId, body]) =>
                selfHostedRecord([
                  ["tag", selfHostedString(tag)],
                  ["variable_id", selfHostedNumber(variableId)],
                  ["body", convert(body)],
                ]),
              ),
            ),
          ],
        ]),
      );
    }
    case "Call": {
      const callArguments = node.arguments as ReadonlyArray<{
        readonly name: string;
        readonly value: unknown;
      }>;
      return selfHostedVariant(
        "call",
        selfHostedRecord([
          ["function", calleeToSelfHostedAst(node.function, convert)],
          [
            "arguments",
            selfHostedList(
              callArguments.map((argument) =>
                selfHostedRecord([
                  ["name", selfHostedString(argument.name)],
                  ["value", convert(argument.value)],
                ]),
              ),
            ),
          ],
        ]),
      );
    }
    case "Function":
      return selfHostedVariant(
        "function",
        selfHostedRecord([
          [
            "parameters",
            selfHostedList(
              (
                node.parameters as ReadonlyArray<{
                  readonly parameter_id: number;
                  readonly parameter_name: string;
                }>
              ).map((parameter) =>
                selfHostedRecord([
                  ["parameter_id", selfHostedNumber(parameter.parameter_id)],
                  [
                    "parameter_name",
                    selfHostedString(parameter.parameter_name),
                  ],
                ]),
              ),
            ),
          ],
          ["body", convert(node.body)],
        ]),
      );
    case "PartReference":
      return selfHostedVariant(
        "part_reference",
        selfHostedRecord([
          [
            "part_definition_event_hash",
            selfHostedString(partReferenceId(node.part_definition_event_hash)),
          ],
        ]),
      );
    case "Let": {
      const bindings = node.bindings as ReadonlyArray<{
        readonly variable_id: number;
        readonly value: unknown;
      }>;
      return bindings.reduceRight<unknown>(
        (body, binding) =>
          selfHostedVariant(
            "let",
            selfHostedRecord([
              ["variable_id", selfHostedNumber(binding.variable_id)],
              ["value", convert(binding.value)],
              ["body", body],
            ]),
          ),
        convert(node.body),
      );
    }
    case "Quote":
      // コードそのものを値にする式. 型は Code<中の式の型>, 値は core.code ({ expression, parts }) (docs/quote.md)
      return selfHostedVariant("quote", convert(node.expression));
    case "Hole":
      return holeToSelfHostedAst(node, allowHoles);
    case "Compiler":
      // コンパイラ組み込みのパーツの式. 呼び出しは definy 側 (`core.compile-builtin-call` など) が名前で扱う
      return selfHostedVariant("builtin", selfHostedString(String(obj[key])));
  }
  throw new SelfHostedAstConversionError(
    `core.expression cannot represent ${key || JSON.stringify(ast)}`,
  );
}

/**
 * 呼び出しの関数の位置 (`Call.function`) を `core.callee` の値にする.
 * 関数は呼び出すもので値として書けないので, 呼び出せるのはパーツ (`PartReference`), 関数型の引数 (`Variable`),
 * レコードの関数のフィールド (`RecordGet`) だけ. 他の式 (ラムダ式の即時呼び出し・呼び出しの結果の呼び出しなど) は
 * `SelfHostedAstConversionError` を投げる. `core.callee` のバリアントは `core.expression` の同じ名前のバリアントと同じ形
 */
function calleeToSelfHostedAst(
  callee: unknown,
  convert: (child: unknown) => unknown,
): unknown {
  const key =
    callee && typeof callee === "object" ? (Object.keys(callee)[0] ?? "") : "";
  if (key === "PartReference" || key === "Variable" || key === "RecordGet") {
    return convert(callee);
  }
  throw new SelfHostedAstConversionError(
    `A call can only call a part, a function parameter or a function field of a record, not ${key || JSON.stringify(callee)}`,
  );
}

/** 式の中の `PartReference` の ID を出現順に集める */
function collectPartReferenceIds(expression: unknown): ReadonlyArray<string> {
  const references: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return;
    }
    const obj = value as Record<string, unknown>;
    const reference = obj.PartReference as
      { readonly part_definition_event_hash?: unknown } | undefined;
    if (reference && typeof reference === "object") {
      references.push(partReferenceId(reference.part_definition_event_hash));
    }
    Object.values(obj).forEach(walk);
  };
  walk(expression);
  return references;
}

/**
 * 式が (参照先をたどって) 参照するパーツを集める.
 * 旧 Rust 版と同じ順序 (末尾から取り出す LIFO)。`wasm/stage1.wasm` の再生成でバイト一致させるために必要。
 * `resolve` は ID からパーツの式 (definy の JSON AST) を返す. 見つからない・式を持たないときは `undefined`.
 * 見つからない・式を持たない・`core.expression` で表せないパーツの ID は `unresolved` に入れる
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
    if (partExpression == null) {
      unresolved.push(id);
      continue;
    }
    try {
      definyAstToSelfHostedAst(partExpression);
    } catch (e) {
      // 型の式など, core.expression で表せないパーツは渡さない
      if (e instanceof SelfHostedAstConversionError) {
        unresolved.push(id);
        continue;
      }
      throw e;
    }
    queue = [...queue, ...collectPartReferenceIds(partExpression)];
    parts.push({ id, expression: partExpression });
  }
  return { parts, unresolved };
}

/** stage1 (`core.compile-to-wasm`) に渡すパーツの一覧 `[{ id, expression }]` を作る式 */
export function stage1PartsExpression(
  parts: ReadonlyArray<Stage1ReferencedPart>,
): unknown {
  return selfHostedList(
    parts.map((part) =>
      selfHostedRecord([
        ["id", selfHostedString(part.id)],
        ["expression", definyAstToSelfHostedAst(part.expression)],
      ]),
    ),
  );
}

/** stage1 でコンパイルした式の Wasm のインスタンスと, `evaluate()` の結果の値 */
export type CompiledValueInstance = {
  readonly exports: WasmExports;
  /** `evaluate()` が返した値のポインタ */
  readonly root: number;
  /**
   * リテラルの式 (`Variant` / `TypeLiteral` / `ListLiteral` / `String` / `Number` / `Boolean` の木) を
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
      const effectiveExpr = definyAstToSelfHostedAst(expressionAst);
      const partsNode = stage1PartsExpression(referencedParts);

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

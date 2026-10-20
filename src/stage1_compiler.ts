/**
 * definy の自己記述コンパイラ (`stage1.wasm`) をブラウザ / Worker / Node.js の
 * WebAssembly ランタイム上で直接実行し、definy の式から Wasm バイナリを動的に生成するパイプライン。
 */

import { bytesToUrlSafeBase64NoPad, toUint8Array } from "./cbor.ts";

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

type WasmExports = {
  readonly evaluate: () => number;
  readonly table: WebAssembly.Table;
  readonly memory: WebAssembly.Memory;
  readonly alloc: (size: number) => number;
};

function writeLiteral(exports: WasmExports, node: unknown): number {
  function push(
    buffer: Array<number>,
    base: number,
    bytes: ReadonlyArray<number>,
  ): number {
    const ptr = base + buffer.length;
    buffer.push(...bytes);
    while (buffer.length % 8 !== 0) {
      buffer.push(0);
    }
    return ptr;
  }

  function writeString(
    buffer: Array<number>,
    base: number,
    val: string,
  ): number {
    const encoder = new TextEncoder();
    const strBytes = encoder.encode(val);
    const bytes: Array<number> = [2, 0, 0, 0];
    const lenView = new DataView(new ArrayBuffer(4));
    lenView.setUint32(0, strBytes.length, true);
    bytes.push(...new Uint8Array(lenView.buffer));
    bytes.push(...strBytes);
    return push(buffer, base, bytes);
  }

  function layout(n: unknown, base: number, buffer: Array<number>): number {
    if (!n || typeof n !== "object") {
      throw new Error(`Invalid AST node for layout: ${JSON.stringify(n)}`);
    }
    const obj = n as Record<string, unknown>;

    if (obj.Variant) {
      const v = obj.Variant as {
        readonly tag: string;
        readonly payload?: unknown;
      };
      const tagPtr = writeString(buffer, base, v.tag);
      const payloadPtr = v.payload ? layout(v.payload, base, buffer) : 0;
      const bytes: number[] = [6, 0, 0, 0];
      const pView = new DataView(new ArrayBuffer(8));
      pView.setUint32(0, tagPtr, true);
      pView.setUint32(4, payloadPtr, true);
      bytes.push(...new Uint8Array(pView.buffer));
      return push(buffer, base, bytes);
    }
    if (obj.Number) {
      const num = obj.Number as { readonly value: number };
      const bytes: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
      const nView = new DataView(new ArrayBuffer(8));
      nView.setBigInt64(0, BigInt(num.value), true);
      bytes.push(...new Uint8Array(nView.buffer));
      return push(buffer, base, bytes);
    }
    if (obj.Boolean) {
      const b = obj.Boolean as { readonly value: boolean };
      return push(buffer, base, [1, 0, 0, 0, 0, 0, 0, 0, b.value ? 1 : 0]);
    }
    if (obj.String) {
      const s = obj.String as { readonly value: string };
      return writeString(buffer, base, s.value);
    }
    if (obj.ListLiteral) {
      const list = obj.ListLiteral as {
        readonly items: ReadonlyArray<unknown>;
      };
      const itemPtrs = list.items.map((item) => layout(item, base, buffer));
      const bytes: number[] = [3, 0, 0, 0];
      const countView = new DataView(new ArrayBuffer(4));
      countView.setUint32(0, itemPtrs.length, true);
      bytes.push(...new Uint8Array(countView.buffer));
      for (const ptr of itemPtrs) {
        const ptrView = new DataView(new ArrayBuffer(4));
        ptrView.setUint32(0, ptr, true);
        bytes.push(...new Uint8Array(ptrView.buffer));
      }
      return push(buffer, base, bytes);
    }
    if (obj.TypeLiteral) {
      const record = obj.TypeLiteral as {
        readonly items: ReadonlyArray<{
          readonly key: string;
          readonly value: unknown;
        }>;
      };
      const fieldPairs = record.items.map((it) => {
        const kPtr = writeString(buffer, base, it.key);
        const vPtr = layout(it.value, base, buffer);
        return [kPtr, vPtr] as const;
      });
      const bytes: number[] = [4, 0, 0, 0];
      const countView = new DataView(new ArrayBuffer(4));
      countView.setUint32(0, fieldPairs.length, true);
      bytes.push(...new Uint8Array(countView.buffer));
      for (const [kPtr, vPtr] of fieldPairs) {
        const pairView = new DataView(new ArrayBuffer(8));
        pairView.setUint32(0, kPtr, true);
        pairView.setUint32(4, vPtr, true);
        bytes.push(...new Uint8Array(pairView.buffer));
      }
      return push(buffer, base, bytes);
    }
    throw new Error(`Unsupported literal node in layout: ${JSON.stringify(n)}`);
  }

  const sizingBuffer: Array<number> = [];
  layout(node, 0, sizingBuffer);

  const base = exports.alloc(sizingBuffer.length);
  const actualBuffer: Array<number> = [];
  const ptr = layout(node, base, actualBuffer);

  const mem = new Uint8Array(exports.memory.buffer);
  mem.set(actualBuffer, base);
  return ptr;
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
    const items: Array<DefinyValue> = [];
    for (let i = 0; i < count; i++) {
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      items.push(readDefinyValue(mem, elemPtr));
    }
    return items;
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

function selfHostedVariant(tag: string, payload?: unknown): unknown {
  return payload === undefined
    ? { Variant: { tag } }
    : { Variant: { tag, payload } };
}

function selfHostedRecord(items: ReadonlyArray<readonly [string, unknown]>) {
  return {
    TypeLiteral: {
      items: items.map(([key, value]) => ({ key, value })),
    },
  };
}

function selfHostedList(items: ReadonlyArray<unknown>) {
  return { ListLiteral: { items } };
}

function selfHostedNumber(value: number) {
  return { Number: { value } };
}

function selfHostedString(value: string) {
  return { String: { value } };
}

const binaryOperators: ReadonlyArray<readonly [string, string]> = [
  ["Add", "add"],
  ["Subtract", "subtract"],
  ["Multiply", "multiply"],
  ["Divide", "divide"],
  ["Remainder", "remainder"],
  ["Equal", "equal"],
  ["NotEqual", "not_equal"],
  ["LessThan", "less_than"],
  ["LessThanOrEqual", "less_than_or_equal"],
  ["GreaterThan", "greater_than"],
  ["GreaterThanOrEqual", "greater_than_or_equal"],
  ["And", "and"],
  ["Or", "or"],
  ["StringConcat", "string_concat"],
  ["ListConcat", "list_concat"],
];

const unaryOperators: ReadonlyArray<readonly [string, string]> = [
  ["Not", "not"],
  ["StringLength", "string_length"],
  ["StringToBytes", "string_to_bytes"],
  ["ListLength", "list_length"],
];

/**
 * definy の JSON AST (`{"Add": {...}}` など) を, stage1 (`core.compile-to-wasm`) が受け取る
 * `core.expression` の値 (`Variant` / `TypeLiteral` / `ListLiteral` などのリテラルの木) に変換する.
 * 旧 Rust 版 `definy_core::self_hosted_ast::expression_to_self_hosted_ast` の移植.
 * `core.expression` で表せない式 (ビット演算・型の式・コンパイラ組み込み・未入力) は
 * `SelfHostedAstConversionError` を投げる
 */
export function definyAstToSelfHostedAst(ast: unknown): unknown {
  if (ast === "Hole") {
    throw new SelfHostedAstConversionError("Expression has an unfilled hole");
  }
  if (!ast || typeof ast !== "object") {
    throw new SelfHostedAstConversionError(
      `Invalid expression: ${JSON.stringify(ast)}`,
    );
  }
  const obj = ast as Record<string, unknown>;
  const key = Object.keys(obj)[0] ?? "";
  const node = obj[key] as Record<string, unknown>;
  const convert = definyAstToSelfHostedAst;

  for (const [astKey, tag] of binaryOperators) {
    if (key === astKey) {
      return selfHostedVariant(
        tag,
        selfHostedRecord([
          ["left", convert(node.left)],
          ["right", convert(node.right)],
        ]),
      );
    }
  }
  for (const [astKey, tag] of unaryOperators) {
    if (key === astKey) {
      return selfHostedVariant(
        tag,
        selfHostedRecord([["value", convert(node.value)]]),
      );
    }
  }

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
    case "Call":
      return selfHostedVariant(
        "call",
        selfHostedRecord([
          ["function", convert(node.function)],
          [
            "arguments",
            selfHostedList(
              (
                node.arguments as ReadonlyArray<{
                  readonly name: string;
                  readonly value: unknown;
                }>
              ).map((argument) =>
                selfHostedRecord([
                  ["name", selfHostedString(argument.name)],
                  ["value", convert(argument.value)],
                ]),
              ),
            ),
          ],
        ]),
      );
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
    case "StringSlice":
      return selfHostedVariant(
        "string_slice",
        selfHostedRecord([
          ["value", convert(node.value)],
          ["start", convert(node.start)],
          ["end", convert(node.end)],
        ]),
      );
    case "ListGet":
      return selfHostedVariant(
        "list_get",
        selfHostedRecord([
          ["list", convert(node.list)],
          ["index", convert(node.index)],
        ]),
      );
    case "ListAppend":
      return selfHostedVariant(
        "list_append",
        selfHostedRecord([
          ["list", convert(node.list)],
          ["item", convert(node.item)],
        ]),
      );
    case "Hole":
      throw new SelfHostedAstConversionError("Expression has an unfilled hole");
  }
  throw new SelfHostedAstConversionError(
    `core.expression cannot represent ${key || JSON.stringify(ast)}`,
  );
}

/** 式の中の `PartReference` の ID を出現順に集める */
function collectPartReferenceIds(expression: unknown, out: Array<string>) {
  if (Array.isArray(expression)) {
    for (const item of expression) {
      collectPartReferenceIds(item, out);
    }
    return;
  }
  if (!expression || typeof expression !== "object") {
    return;
  }
  if (expression instanceof Uint8Array) {
    return;
  }
  const obj = expression as Record<string, unknown>;
  const reference = obj.PartReference as
    { readonly part_definition_event_hash?: unknown } | undefined;
  if (reference && typeof reference === "object") {
    out.push(partReferenceId(reference.part_definition_event_hash));
  }
  for (const value of Object.values(obj)) {
    collectPartReferenceIds(value, out);
  }
}

/**
 * 式が (参照先をたどって) 参照するパーツを集める.
 * `resolve` は ID からパーツの式 (definy の JSON AST) を返す. 見つからない・式を持たないときは `undefined`.
 * 見つからない・式を持たない・`core.expression` で表せないパーツの ID は `unresolved` に入れる
 * (stage1 はその参照を unreachable にコンパイルする)
 */
export function collectReferencedParts(
  expression: unknown,
  resolve: (id: string) => unknown,
): {
  readonly parts: ReadonlyArray<Stage1ReferencedPart>;
  readonly unresolved: ReadonlyArray<string>;
} {
  const queue: Array<string> = [];
  collectPartReferenceIds(expression, queue);
  const seen = new Set<string>();
  const parts: Array<Stage1ReferencedPart> = [];
  const unresolved: Array<string> = [];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (seen.has(id)) {
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
      // コンパイラ組み込み (`{"Compiler": ...}`) など core.expression で表せないパーツは渡さない
      if (e instanceof SelfHostedAstConversionError) {
        unresolved.push(id);
        continue;
      }
      throw e;
    }
    collectPartReferenceIds(partExpression, queue);
    parts.push({ id, expression: partExpression });
  }
  return { parts, unresolved };
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
      const partsNode = selfHostedList(
        referencedParts.map((part) =>
          selfHostedRecord([
            ["id", selfHostedString(part.id)],
            ["expression", definyAstToSelfHostedAst(part.expression)],
          ]),
        ),
      );

      const instance = new WebAssembly.Instance(stage1Module, {});
      const exports = instance.exports as unknown as WasmExports;

      const closurePtr = exports.evaluate();
      const view = new DataView(exports.memory.buffer);
      const tag = view.getUint8(closurePtr);
      if (tag !== 5) {
        throw new Error(
          `stage1.wasm evaluate() did not return a function closure (tag: ${tag})`,
        );
      }
      const tableIndex = view.getUint32(closurePtr + 4, true);
      const envPtr = view.getInt32(closurePtr + 8, true);

      const exprPtr = writeLiteral(exports, effectiveExpr);
      const partsPtr = writeLiteral(exports, partsNode);

      const argsPtr = exports.alloc(8);
      const argsView = new DataView(exports.memory.buffer);
      argsView.setUint32(argsPtr, exprPtr, true);
      argsView.setUint32(argsPtr + 4, partsPtr, true);

      const fn = exports.table.get(tableIndex) as (
        env: number,
        args: number,
      ) => number;
      const resultPtr = fn(envPtr, argsPtr);

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

let stage1CompilerPromise: Promise<Stage1CompilerInstance> | null = null;

/**
 * ブラウザから `/virtual/wasm/stage1.wasm` を取得して stage1 コンパイラを作る。
 * 取得・コンパイルは 1 度だけ行い、失敗した場合は次回呼び出し時に再試行する。
 */
export function loadStage1Compiler(): Promise<Stage1CompilerInstance> {
  stage1CompilerPromise ??= (async () => {
    const res = await fetch("/virtual/wasm/stage1.wasm");
    if (!res.ok) {
      throw new Error(
        `Failed to fetch stage1.wasm: ${res.status} ${res.statusText}`,
      );
    }
    return createStage1Compiler(
      await WebAssembly.compile(await res.arrayBuffer()),
    );
  })().catch((e: unknown) => {
    stage1CompilerPromise = null;
    throw e;
  });
  return stage1CompilerPromise;
}

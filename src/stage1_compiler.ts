/**
 * definy の自己記述コンパイラ (`stage1.wasm`) をブラウザ / Worker / Node.js の
 * WebAssembly ランタイム上で直接実行し、definy の式から Wasm バイナリを動的に生成するパイプライン。
 */

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

export interface Stage1CompilerInstance {
  readonly compile: (
    expressionAst: unknown,
    referencedPartsAst?: unknown,
  ) => Uint8Array;
}

interface WasmExports {
  readonly evaluate: () => number;
  readonly table: WebAssembly.Table;
  readonly memory: WebAssembly.Memory;
  readonly alloc: (size: number) => number;
}

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

export function definyAstToSelfHostedAst(ast: unknown): unknown {
  if (!ast || typeof ast !== "object") {
    return ast;
  }
  const obj = ast as Record<string, unknown>;
  if ("Variant" in obj) {
    return ast;
  }
  if (
    "Number" in obj &&
    typeof obj.Number === "object" &&
    obj.Number !== null
  ) {
    const num = obj.Number as { readonly value: number };
    return {
      Variant: {
        tag: "number",
        payload: { Number: { value: num.value } },
      },
    };
  }
  if (
    "String" in obj &&
    typeof obj.String === "object" &&
    obj.String !== null
  ) {
    const str = obj.String as { readonly value: string };
    return {
      Variant: {
        tag: "string",
        payload: { String: { value: str.value } },
      },
    };
  }
  if (
    "Boolean" in obj &&
    typeof obj.Boolean === "object" &&
    obj.Boolean !== null
  ) {
    const b = obj.Boolean as { readonly value: boolean };
    return {
      Variant: {
        tag: "boolean",
        payload: { Boolean: { value: b.value } },
      },
    };
  }
  if (
    "Variable" in obj &&
    typeof obj.Variable === "object" &&
    obj.Variable !== null
  ) {
    const v = obj.Variable as { readonly variable_id: number };
    return {
      Variant: {
        tag: "variable",
        payload: {
          TypeLiteral: {
            items: [
              {
                key: "variable_id",
                value: { Number: { value: v.variable_id } },
              },
            ],
          },
        },
      },
    };
  }
  const binaryOps: ReadonlyArray<readonly [string, string]> = [
    ["Add", "add"],
    ["Plus", "add"],
    ["Subtract", "subtract"],
    ["Minus", "subtract"],
    ["Multiply", "multiply"],
    ["Divide", "divide"],
    ["Remainder", "remainder"],
    ["LessThan", "less_than"],
    ["LessThanOrEqual", "less_than_or_equal"],
    ["GreaterThan", "greater_than"],
    ["GreaterThanOrEqual", "greater_than_or_equal"],
    ["Equal", "equal"],
    ["NotEqual", "not_equal"],
  ];
  for (const [astKey, tag] of binaryOps) {
    if (
      astKey in obj &&
      typeof obj[astKey] === "object" &&
      obj[astKey] !== null
    ) {
      const bin = obj[astKey] as {
        readonly left: unknown;
        readonly right: unknown;
      };
      return {
        Variant: {
          tag,
          payload: {
            TypeLiteral: {
              items: [
                { key: "left", value: definyAstToSelfHostedAst(bin.left) },
                { key: "right", value: definyAstToSelfHostedAst(bin.right) },
              ],
            },
          },
        },
      };
    }
  }
  if ("Let" in obj && typeof obj.Let === "object" && obj.Let !== null) {
    const letNode = obj.Let as {
      readonly bindings: ReadonlyArray<{
        readonly variable_id: number;
        readonly value: unknown;
      }>;
      readonly body: unknown;
    };
    const bindings = letNode.bindings || [];
    let curBody = definyAstToSelfHostedAst(letNode.body);
    for (let i = bindings.length - 1; i >= 0; i--) {
      const b = bindings[i];
      if (!b) {
        continue;
      }
      curBody = {
        Variant: {
          tag: "let",
          payload: {
            TypeLiteral: {
              items: [
                {
                  key: "variable_id",
                  value: { Number: { value: b.variable_id } },
                },
                {
                  key: "value",
                  value: definyAstToSelfHostedAst(b.value),
                },
                {
                  key: "body",
                  value: curBody,
                },
              ],
            },
          },
        },
      };
    }
    return curBody;
  }
  return ast;
}

export function createStage1Compiler(
  stage1Module: WebAssembly.Module,
): Stage1CompilerInstance {
  return {
    compile(expressionAst: unknown, referencedPartsAst?: unknown): Uint8Array {
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

      const partsNode = referencedPartsAst ?? { ListLiteral: { items: [] } };
      const effectiveExpr = definyAstToSelfHostedAst(expressionAst);
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

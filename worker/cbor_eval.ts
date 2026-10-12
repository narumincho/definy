import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  deriveModuleIdBytes,
  deriveModulePartId,
  encodeCborItem,
  type ParsedSignedEventMeta,
  parseSignedEventMetadata,
  sha256Bytes,
  sha256EventHashId,
  toUint8Array,
} from "./cbor.ts";
export {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  deriveModuleIdBytes,
  deriveModulePartId,
  encodeCborItem,
  type ParsedSignedEventMeta,
  parseSignedEventMetadata,
  sha256Bytes,
  sha256EventHashId,
  toUint8Array,
};

export type DefinyValue =
  | number
  | string
  | boolean
  | null
  | ReadonlyArray<DefinyValue>
  | { readonly __variant: string; readonly payload: DefinyValue }
  | {
    readonly __fn: true;
    readonly parameters: ReadonlyArray<
      { readonly name: string; readonly variable_id: number }
    >;
    readonly body: unknown;
    readonly closureEnv: ReadonlyMap<number, DefinyValue>;
    readonly resolvePartExpr?: (
      partHash: string,
    ) => Promise<unknown | undefined>;
  }
  | {
    readonly __nativeFn: (
      arg: DefinyValue,
    ) => Promise<DefinyValue> | DefinyValue;
  }
  | { readonly [key: string]: DefinyValue };

function readDefinyValueFromWasmMemory(
  memory: WebAssembly.Memory,
  table: WebAssembly.Table | undefined,
  ptr: number,
): DefinyValue {
  const mem = new Uint8Array(memory.buffer);
  if (ptr < 0 || ptr >= mem.length) return null;
  const view = new DataView(mem.buffer, mem.byteOffset, mem.byteLength);
  const tag = view.getInt32(ptr, true);
  if (tag === 0) {
    return Number(view.getBigInt64(ptr + 8, true));
  }
  if (tag === 1) {
    return view.getInt32(ptr + 4, true) !== 0;
  }
  if (tag === 2) {
    const len = view.getUint32(ptr + 4, true);
    return new TextDecoder().decode(mem.subarray(ptr + 8, ptr + 8 + len));
  }
  if (tag === 3) {
    const count = view.getUint32(ptr + 4, true);
    const items: DefinyValue[] = [];
    for (let i = 0; i < count; i++) {
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      items.push(readDefinyValueFromWasmMemory(memory, table, elemPtr));
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
      const keyStr = readDefinyValueFromWasmMemory(memory, table, keyPtr);
      if (typeof keyStr === "string") {
        obj[keyStr] = readDefinyValueFromWasmMemory(memory, table, valPtr);
      }
    }
    return obj;
  }
  if (tag === 5) {
    const tableIdx = view.getUint32(ptr + 4, true);
    const envPtr = view.getInt32(ptr + 8, true);
    const fn = table?.get(tableIdx) as
      | ((env: number, argsPtr: number) => number)
      | undefined;
    return {
      __nativeFn: (argVal: DefinyValue): DefinyValue => {
        if (!fn) {
          throw new Error("Wasm indirect function table not available");
        }
        const liveMem = new Uint8Array(memory.buffer);
        const liveView = new DataView(
          liveMem.buffer,
          liveMem.byteOffset,
          liveMem.byteLength,
        );
        // Write boxed or pointer argument into scratch slot at 512..528
        let argPtr = 0;
        if (
          argVal &&
          typeof argVal === "object" &&
          "__wasmPtr" in argVal &&
          typeof (argVal as { __wasmPtr?: unknown }).__wasmPtr === "number"
        ) {
          argPtr = (argVal as { __wasmPtr: number }).__wasmPtr;
        } else if (typeof argVal === "number") {
          argPtr = 520;
          liveView.setInt32(argPtr, 0, true);
          liveView.setInt32(argPtr + 4, 0, true);
          liveView.setBigInt64(argPtr + 8, BigInt(Math.trunc(argVal)), true);
        }
        liveView.setInt32(512, argPtr, true);
        const stepPtr = fn(envPtr, 512);
        return readDefinyValueFromWasmMemory(memory, table, stepPtr);
      },
    };
  }
  if (tag === 6) {
    const tagPtr = view.getUint32(ptr + 4, true);
    const hasPayload = view.getUint32(ptr + 8, true);
    const payloadPtr = view.getUint32(ptr + 12, true);
    const tagName = String(
      readDefinyValueFromWasmMemory(memory, table, tagPtr) ?? "",
    );
    const payloadVal = hasPayload !== 0
      ? readDefinyValueFromWasmMemory(memory, table, payloadPtr)
      : null;
    if (
      tagName === "yield" &&
      payloadVal &&
      typeof payloadVal === "object" &&
      !Array.isArray(payloadVal) &&
      hasPayload !== 0
    ) {
      // Preserve raw Wasm pointer for nextState so stateful closures (e.g. List<String>) can step without re-allocation
      const pView = new DataView(
        memory.buffer,
        memory.buffer.byteLength > 0 ? 0 : 0,
      );
      const fieldCount = pView.getUint32(payloadPtr + 4, true);
      for (let i = 0; i < fieldCount; i++) {
        const base = payloadPtr + 8 + i * 8;
        const kPtr = pView.getUint32(base, true);
        const vPtr = pView.getUint32(base + 4, true);
        const kName = readDefinyValueFromWasmMemory(memory, table, kPtr);
        if (kName === "nextState") {
          return {
            __variant: tagName,
            payload: {
              ...(payloadVal as Record<string, DefinyValue>),
              nextState: { __wasmPtr: vPtr },
            },
          };
        }
      }
    }
    return { __variant: tagName, payload: payloadVal };
  }
  return null;
}

/**
 * コンパイル済み Wasm バイナリを実行し、`DefinyValue` を返す
 */
export async function executeWasmBinary(
  wasmBytes: Uint8Array,
): Promise<DefinyValue> {
  const copy = new Uint8Array(wasmBytes.byteLength);
  copy.set(wasmBytes);
  const instantiated = await WebAssembly.instantiate(copy.buffer, {
    env: {
      print: () => undefined,
    },
  });
  const instance = "instance" in instantiated
    ? instantiated.instance
    : instantiated;
  const exports = instance.exports as {
    main?: () => bigint | number;
    memory?: WebAssembly.Memory;
    table?: WebAssembly.Table;
  };
  if (typeof exports.main !== "function") {
    throw new Error("Wasm binary does not export a 'main' function");
  }
  const rawRes = exports.main();
  const numRes = typeof rawRes === "bigint" ? Number(rawRes) : rawRes;
  if (exports.memory) {
    return (
      readDefinyValueFromWasmMemory(exports.memory, exports.table, numRes) ??
        numRes
    );
  }
  return numRes;
}

/**
 * CBOR からデコードされた definy の `Expression` AST を評価する
 */
export async function evaluateCborExpression(
  expr: unknown,
  vars: ReadonlyMap<number, DefinyValue>,
  resolvePartExpr: (partHash: string) => Promise<unknown | undefined>,
  depth = 0,
): Promise<DefinyValue> {
  if (depth > 256) {
    throw new Error("Maximum evaluation recursion depth exceeded");
  }
  if (!expr || typeof expr !== "object") {
    return null;
  }
  const node = expr as Record<string, Record<string, unknown>>;

  if ("Number" in node) {
    const raw = node.Number as unknown;
    return typeof raw === "number"
      ? raw
      : Number((raw as { value?: unknown })?.value ?? 0);
  }
  if ("String" in node) {
    const raw = node.String as unknown;
    return typeof raw === "string"
      ? raw
      : String((raw as { value?: unknown })?.value ?? "");
  }
  if ("Boolean" in node) {
    const raw = node.Boolean as unknown;
    return typeof raw === "boolean"
      ? raw
      : Boolean((raw as { value?: unknown })?.value);
  }
  if ("Variable" in node) {
    const raw = node.Variable as unknown;
    const id = typeof raw === "number"
      ? raw
      : Number((raw as { variable_id?: unknown })?.variable_id);
    return vars.get(id) ?? null;
  }
  if ("Add" in node || "StringConcat" in node) {
    const inner = node.Add ?? node.StringConcat;
    const l = await evaluateCborExpression(
      inner.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      inner.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    if (
      "StringConcat" in node ||
      typeof l === "string" ||
      typeof r === "string"
    ) {
      return `${l ?? ""}${r ?? ""}`;
    }
    return Number(l) + Number(r);
  }
  if ("StringLength" in node) {
    const v = await evaluateCborExpression(
      node.StringLength.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return typeof v === "string" ? new TextEncoder().encode(v).length : 0;
  }
  if ("StringSlice" in node) {
    const v = await evaluateCborExpression(
      node.StringSlice.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const start = Number(
      await evaluateCborExpression(
        node.StringSlice.start,
        vars,
        resolvePartExpr,
        depth + 1,
      ),
    );
    const end = Number(
      await evaluateCborExpression(
        node.StringSlice.end,
        vars,
        resolvePartExpr,
        depth + 1,
      ),
    );
    if (typeof v !== "string") return "";
    const bytes = new TextEncoder().encode(v);
    const s = Math.max(0, Math.min(start, bytes.length));
    const e = Math.max(s, Math.min(end, bytes.length));
    return new TextDecoder().decode(bytes.subarray(s, e));
  }
  if ("StringToBytes" in node) {
    const v = await evaluateCborExpression(
      node.StringToBytes.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    if (typeof v !== "string") return [];
    return Array.from(new TextEncoder().encode(v));
  }
  if ("Subtract" in node) {
    const l = await evaluateCborExpression(
      node.Subtract.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.Subtract.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) - Number(r);
  }
  if ("Multiply" in node) {
    const l = await evaluateCborExpression(
      node.Multiply.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.Multiply.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) * Number(r);
  }
  if ("Divide" in node) {
    const l = await evaluateCborExpression(
      node.Divide.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.Divide.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const divisor = Number(r);
    return divisor === 0 ? 0 : Math.trunc(Number(l) / divisor);
  }
  if ("Remainder" in node) {
    const l = await evaluateCborExpression(
      node.Remainder.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.Remainder.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const divisor = Number(r);
    return divisor === 0 ? 0 : Number(l) % divisor;
  }
  if ("Equal" in node) {
    const l = await evaluateCborExpression(
      node.Equal.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.Equal.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return JSON.stringify(l) === JSON.stringify(r);
  }
  if ("NotEqual" in node) {
    const l = await evaluateCborExpression(
      node.NotEqual.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.NotEqual.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return JSON.stringify(l) !== JSON.stringify(r);
  }
  if ("LessThan" in node) {
    const l = await evaluateCborExpression(
      node.LessThan.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.LessThan.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) < Number(r);
  }
  if ("LessThanOrEqual" in node) {
    const l = await evaluateCborExpression(
      node.LessThanOrEqual.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.LessThanOrEqual.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) <= Number(r);
  }
  if ("GreaterThan" in node) {
    const l = await evaluateCborExpression(
      node.GreaterThan.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.GreaterThan.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) > Number(r);
  }
  if ("GreaterThanOrEqual" in node) {
    const l = await evaluateCborExpression(
      node.GreaterThanOrEqual.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.GreaterThanOrEqual.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Number(l) >= Number(r);
  }
  if ("And" in node) {
    const l = await evaluateCborExpression(
      node.And.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    if (!l) return false;
    const r = await evaluateCborExpression(
      node.And.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Boolean(r);
  }
  if ("Or" in node) {
    const l = await evaluateCborExpression(
      node.Or.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    if (l) return true;
    const r = await evaluateCborExpression(
      node.Or.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Boolean(r);
  }
  if ("Not" in node) {
    const v = await evaluateCborExpression(
      node.Not.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return !v;
  }
  if ("If" in node) {
    const cond = await evaluateCborExpression(
      node.If.condition,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return cond
      ? await evaluateCborExpression(
        node.If.then_expr ?? node.If.then,
        vars,
        resolvePartExpr,
        depth + 1,
      )
      : await evaluateCborExpression(
        node.If.else_expr ?? node.If.else,
        vars,
        resolvePartExpr,
        depth + 1,
      );
  }
  if ("Let" in node) {
    const val = await evaluateCborExpression(
      node.Let.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const nextVars = new Map<number, DefinyValue>(vars);
    nextVars.set(Number(node.Let.variable_id), val);
    return await evaluateCborExpression(
      node.Let.body,
      nextVars,
      resolvePartExpr,
      depth + 1,
    );
  }
  if ("ListLiteral" in node) {
    const rawItems = (node.ListLiteral.items as ReadonlyArray<unknown>) ?? [];
    const out: DefinyValue[] = [];
    for (const item of rawItems) {
      out.push(
        await evaluateCborExpression(item, vars, resolvePartExpr, depth + 1),
      );
    }
    return out;
  }
  if ("ListConcat" in node) {
    const l = await evaluateCborExpression(
      node.ListConcat.left,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const r = await evaluateCborExpression(
      node.ListConcat.right,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return [
      ...(Array.isArray(l) ? l : []),
      ...(Array.isArray(r) ? r : []),
    ];
  }
  if ("ListAppend" in node) {
    const l = await evaluateCborExpression(
      node.ListAppend.list,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const elem = await evaluateCborExpression(
      node.ListAppend.item,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return [...(Array.isArray(l) ? l : []), elem];
  }
  if ("ListGet" in node) {
    const l = await evaluateCborExpression(
      node.ListGet.list,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const idx = Number(
      await evaluateCborExpression(
        node.ListGet.index,
        vars,
        resolvePartExpr,
        depth + 1,
      ),
    );
    return Array.isArray(l) && idx >= 0 && idx < l.length ? l[idx] : null;
  }
  if ("ListLength" in node) {
    const l = await evaluateCborExpression(
      node.ListLength.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    return Array.isArray(l) ? l.length : 0;
  }
  if ("TypeLiteral" in node || "RecordLiteral" in node) {
    const inner = node.TypeLiteral ?? node.RecordLiteral;
    const rawItems = (inner.items as ReadonlyArray<Record<string, unknown>>) ??
      [];
    const record: Record<string, DefinyValue> = {};
    for (const item of rawItems) {
      const k = String(item.key ?? item.name ?? "");
      record[k] = await evaluateCborExpression(
        item.value,
        vars,
        resolvePartExpr,
        depth + 1,
      );
    }
    return record;
  }
  if ("RecordGet" in node) {
    const rec = await evaluateCborExpression(
      node.RecordGet.record,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const key = String(node.RecordGet.key ?? node.RecordGet.field_name ?? "");
    if (rec && typeof rec === "object" && !Array.isArray(rec)) {
      return (rec as Record<string, DefinyValue>)[key] ?? null;
    }
    return null;
  }
  if ("Constructor" in node) {
    return await evaluateCborExpression(
      node.Constructor.value,
      vars,
      resolvePartExpr,
      depth + 1,
    );
  }
  if ("Variant" in node) {
    const tag = String(node.Variant.tag ?? "");
    const payload = node.Variant.payload != null
      ? await evaluateCborExpression(
        node.Variant.payload,
        vars,
        resolvePartExpr,
        depth + 1,
      )
      : null;
    return { __variant: tag, payload };
  }
  if ("Match" in node) {
    const target = await evaluateCborExpression(
      node.Match.target,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const variantTag =
      target && typeof target === "object" && "__variant" in target
        ? String((target as { __variant: string }).__variant)
        : "";
    const variantPayload =
      target && typeof target === "object" && "payload" in target
        ? (target as { payload: DefinyValue }).payload
        : null;
    const arms = (node.Match.arms as ReadonlyArray<Record<string, unknown>>) ??
      [];
    for (const arm of arms) {
      const armTag = String(arm.tag ?? "");
      if (armTag === variantTag || armTag === "_") {
        const nextVars = new Map<number, DefinyValue>(vars);
        if (typeof arm.variable_id === "number") {
          nextVars.set(arm.variable_id, variantPayload);
        }
        return await evaluateCborExpression(
          arm.body,
          nextVars,
          resolvePartExpr,
          depth + 1,
        );
      }
    }
    if (node.Match.default != null) {
      return await evaluateCborExpression(
        node.Match.default,
        vars,
        resolvePartExpr,
        depth + 1,
      );
    }
    return null;
  }
  if ("Function" in node) {
    const params =
      ((node.Function.parameters as ReadonlyArray<Record<string, unknown>>) ??
        []).map((p) => ({
          name: String(p.parameter_name ?? p.name ?? ""),
          variable_id: Number(p.parameter_id ?? p.variable_id ?? 0),
        }));
    return {
      __fn: true,
      parameters: params,
      body: node.Function.body,
      closureEnv: vars,
      resolvePartExpr,
    };
  }
  if ("PartReference" in node) {
    const rawHash = node.PartReference.part_definition_event_hash;
    const hashBytes = toUint8Array(rawHash);
    const partHash = hashBytes
      ? bytesToUrlSafeBase64NoPad(hashBytes)
      : String(rawHash ?? "");
    const refExpr = await resolvePartExpr(partHash);
    if (!refExpr) {
      return null;
    }
    return await evaluateCborExpression(
      refExpr,
      new Map(),
      resolvePartExpr,
      depth + 1,
    );
  }
  if ("Call" in node) {
    const fnVal = await evaluateCborExpression(
      node.Call.function,
      vars,
      resolvePartExpr,
      depth + 1,
    );
    const rawArgs =
      (node.Call.arguments as ReadonlyArray<Record<string, unknown>>) ?? [];
    if (fnVal && typeof fnVal === "object" && "__nativeFn" in fnVal) {
      const firstArgVal = rawArgs.length > 0
        ? await evaluateCborExpression(
          rawArgs[0].value,
          vars,
          resolvePartExpr,
          depth + 1,
        )
        : null;
      const nativeFn = (
        fnVal as {
          readonly __nativeFn: (
            arg: DefinyValue,
          ) => Promise<DefinyValue> | DefinyValue;
        }
      ).__nativeFn;
      return await nativeFn(firstArgVal);
    }
    if (fnVal && typeof fnVal === "object" && "__fn" in fnVal) {
      const fnObj = fnVal as {
        readonly parameters: ReadonlyArray<
          { readonly name: string; readonly variable_id: number }
        >;
        readonly body: unknown;
        readonly closureEnv: ReadonlyMap<number, DefinyValue>;
        readonly resolvePartExpr?: (
          partHash: string,
        ) => Promise<unknown | undefined>;
      };
      const callVars = new Map<number, DefinyValue>(fnObj.closureEnv);
      for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        const argName = String(arg.name ?? "");
        const argVal = await evaluateCborExpression(
          arg.value,
          vars,
          resolvePartExpr,
          depth + 1,
        );
        const paramByName = fnObj.parameters.find((p) => p.name === argName);
        const targetParam = paramByName ?? fnObj.parameters[i];
        if (targetParam) {
          callVars.set(targetParam.variable_id, argVal);
        }
      }
      return await evaluateCborExpression(
        fnObj.body,
        callVars,
        fnObj.resolvePartExpr ?? resolvePartExpr,
        depth + 1,
      );
    }
    return null;
  }

  return null;
}

/**
 * 評価済みの関数値（CBOR クロージャまたはネイティブ/Wasm 関数）に 1 引数を渡して呼び出す
 */
export async function callDefinyFunction(
  fnVal: DefinyValue,
  argVal: DefinyValue,
): Promise<DefinyValue> {
  if (!fnVal || typeof fnVal !== "object") {
    throw new Error("Target value is not a callable definy function");
  }
  if ("__nativeFn" in fnVal) {
    const nativeFn = (
      fnVal as {
        readonly __nativeFn: (
          arg: DefinyValue,
        ) => Promise<DefinyValue> | DefinyValue;
      }
    ).__nativeFn;
    return await nativeFn(argVal);
  }
  if ("__fn" in fnVal) {
    const fnObj = fnVal as {
      readonly parameters: ReadonlyArray<
        { readonly name: string; readonly variable_id: number }
      >;
      readonly body: unknown;
      readonly closureEnv: ReadonlyMap<number, DefinyValue>;
      readonly resolvePartExpr?: (
        partHash: string,
      ) => Promise<unknown | undefined>;
    };
    const callVars = new Map<number, DefinyValue>(fnObj.closureEnv);
    if (fnObj.parameters.length > 0) {
      callVars.set(fnObj.parameters[0].variable_id, argVal);
    }
    return await evaluateCborExpression(
      fnObj.body,
      callVars,
      fnObj.resolvePartExpr ?? (() => Promise.resolve(undefined)),
    );
  }
  throw new Error("Target value is not a callable definy function");
}

export {
  createByteStreamDefinyValue,
  definyValueToHttpResponse,
  evaluatePartForHttpRequest,
  type PartStoreReader,
} from "./http_stream.ts";

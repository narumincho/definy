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
import type { Env } from "./types.ts";

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
  }
  | { readonly [key: string]: DefinyValue };

function readDefinyValueFromWasmMemory(
  mem: Uint8Array,
  ptr: number,
): DefinyValue {
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
    const items: DefinyValue[] = [];
    for (let i = 0; i < count; i++) {
      const elemPtr = view.getUint32(ptr + 8 + i * 4, true);
      items.push(readDefinyValueFromWasmMemory(mem, elemPtr));
    }
    return items;
  }
  if (tag === 4) {
    const count = view.getUint32(ptr + 4, true);
    const obj: Record<string, DefinyValue> = {};
    for (let i = 0; i < count; i++) {
      const itemBase = ptr + 8 + i * 16;
      const keyPtr = view.getUint32(itemBase, true);
      const valPtr = view.getUint32(itemBase + 8, true);
      const keyStr = readDefinyValueFromWasmMemory(mem, keyPtr);
      if (typeof keyStr === "string") {
        obj[keyStr] = readDefinyValueFromWasmMemory(mem, valPtr);
      }
    }
    return obj;
  }
  if (tag === 5) {
    const tagPtr = view.getUint32(ptr + 8, true);
    const payloadPtr = view.getUint32(ptr + 16, true);
    const tagName = String(readDefinyValueFromWasmMemory(mem, tagPtr) ?? "");
    const payloadVal = payloadPtr !== 0
      ? readDefinyValueFromWasmMemory(mem, payloadPtr)
      : null;
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
  };
  if (typeof exports.main !== "function") {
    throw new Error("Wasm binary does not export a 'main' function");
  }
  const rawRes = exports.main();
  const numRes = typeof rawRes === "bigint" ? Number(rawRes) : rawRes;
  if (exports.memory) {
    const mem = new Uint8Array(exports.memory.buffer);
    return readDefinyValueFromWasmMemory(mem, numRes) ?? numRes;
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
    return typeof v === "string" ? v.length : 0;
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
    return typeof v === "string" ? v.slice(start, end) : "";
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
        node.If.then_expr,
        vars,
        resolvePartExpr,
        depth + 1,
      )
      : await evaluateCborExpression(
        node.If.else_expr,
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
    if (fnVal && typeof fnVal === "object" && "__fn" in fnVal) {
      const fnObj = fnVal as {
        readonly parameters: ReadonlyArray<
          { readonly name: string; readonly variable_id: number }
        >;
        readonly body: unknown;
        readonly closureEnv: ReadonlyMap<number, DefinyValue>;
      };
      const callVars = new Map<number, DefinyValue>(fnObj.closureEnv);
      const rawArgs =
        (node.Call.arguments as ReadonlyArray<Record<string, unknown>>) ?? [];
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
        resolvePartExpr,
        depth + 1,
      );
    }
    return null;
  }

  return null;
}

export interface PartStoreReader {
  getEvents(
    req: { readonly eventType?: string; readonly limit?: number },
    env?: Env,
  ): Promise<
    ReadonlyArray<{
      readonly eventHash: string;
      readonly signedEventBytes: string;
    }>
  >;
  getRawContentBytes(hash: string, env?: Env): Promise<Uint8Array | undefined>;
}

/**
 * 指定された `partId`（PartHashId / `module.part` / `partName` / `contentHash`）を
 * D1 またはインメモリストアから解決し、HTTP リクエストに対して評価する
 */
export async function evaluatePartForHttpRequest(
  partId: string,
  request: Request,
  subpath: string,
  store: PartStoreReader,
  env?: Env,
): Promise<DefinyValue | undefined> {
  const trimmed = partId.trim();
  if (!trimmed) {
    return undefined;
  }

  // 1. 直接 CAS に Wasm または式 CBOR として存在するかチェック
  const directBytes = await store.getRawContentBytes(trimmed, env);
  if (directBytes && directBytes.length >= 4) {
    if (
      directBytes[0] === 0x00 &&
      directBytes[1] === 0x61 &&
      directBytes[2] === 0x73 &&
      directBytes[3] === 0x6d
    ) {
      return await executeWasmBinary(directBytes);
    }
  }

  // 2. 全 ModuleCommit イベントからパーツ辞書を構築
  const commitEvents = await store.getEvents(
    { eventType: "module_commit", limit: 500 },
    env,
  );
  const partMap = new Map<string, unknown>();

  const loadPartExpression = async (
    partObj: Record<string, unknown>,
  ): Promise<unknown | undefined> => {
    if (partObj.expression != null) {
      return partObj.expression;
    }
    if (partObj.content_hash != null) {
      const hashBytes = toUint8Array(partObj.content_hash);
      const contentHash = hashBytes
        ? bytesToUrlSafeBase64NoPad(hashBytes)
        : String(partObj.content_hash);
      const casBytes = await store.getRawContentBytes(contentHash, env);
      if (casBytes) {
        const [decoded] = decodeCborItem(casBytes);
        return decoded;
      }
    }
    return undefined;
  };

  let targetExpr: unknown | undefined;

  if (directBytes) {
    try {
      const [decoded] = decodeCborItem(directBytes);
      targetExpr = decoded;
    } catch {
      // CBOR ではない場合は無視
    }
  }

  for (const ev of commitEvents) {
    try {
      const evBytes = base64ToBytes(ev.signedEventBytes);
      const [signedRaw] = decodeCborItem(evBytes);
      if (!signedRaw || typeof signedRaw !== "object") continue;
      const signedObj = signedRaw as Record<string, unknown>;
      const eventBinaryField = signedObj.event_binary as
        | { value?: unknown }
        | undefined;
      const innerBytes = toUint8Array(
        eventBinaryField?.value ?? eventBinaryField,
      );
      if (!innerBytes) continue;
      const [innerRaw] = decodeCborItem(innerBytes);
      if (!innerRaw || typeof innerRaw !== "object") continue;
      const innerObj = innerRaw as Record<string, unknown>;
      const accountBytes = toUint8Array(innerObj.account_id);
      const contentObj = innerObj.content as
        | Record<string, unknown>
        | undefined;
      if (!accountBytes || !contentObj || !("ModuleCommit" in contentObj)) {
        continue;
      }
      const mc = contentObj.ModuleCommit as {
        module_name?: string;
        parts?: ReadonlyArray<Record<string, unknown>>;
      };
      const moduleName = String(mc.module_name ?? "");
      const moduleIdBytes = await deriveModuleIdBytes(accountBytes, moduleName);

      for (const part of mc.parts ?? []) {
        if (!part || typeof part !== "object") continue;
        const partName = String(part.name ?? "");
        const derivedId = await deriveModulePartId(moduleIdBytes, partName);

        if (!partMap.has(derivedId)) {
          const expr = await loadPartExpression(part);
          if (expr !== undefined) {
            partMap.set(derivedId, expr);
          }
        }

        if (
          targetExpr === undefined &&
          (derivedId === trimmed ||
            partName === trimmed ||
            `${moduleName}.${partName}` === trimmed)
        ) {
          targetExpr = partMap.get(derivedId) ??
            (await loadPartExpression(part));
        }
      }
    } catch {
      continue;
    }
  }

  if (targetExpr === undefined) {
    return undefined;
  }

  const resolvePartExpr = (partHash: string): Promise<unknown | undefined> =>
    Promise.resolve(partMap.get(partHash));

  const evaluated = await evaluateCborExpression(
    targetExpr,
    new Map(),
    resolvePartExpr,
  );

  // トップレベルが関数の場合、HTTP リクエスト情報を第1引数に渡して呼び出す
  if (evaluated && typeof evaluated === "object" && "__fn" in evaluated) {
    const fnObj = evaluated as {
      readonly parameters: ReadonlyArray<
        { readonly name: string; readonly variable_id: number }
      >;
      readonly body: unknown;
      readonly closureEnv: ReadonlyMap<number, DefinyValue>;
    };
    const callVars = new Map<number, DefinyValue>(fnObj.closureEnv);
    const reqUrl = new URL(request.url);
    const reqValue: DefinyValue = {
      method: request.method,
      path: subpath,
      query: reqUrl.search,
      url: request.url,
    };
    if (fnObj.parameters.length > 0) {
      const firstParam = fnObj.parameters[0];
      if (firstParam.name === "path") {
        callVars.set(firstParam.variable_id, subpath);
      } else {
        callVars.set(firstParam.variable_id, reqValue);
      }
    }
    return await evaluateCborExpression(
      fnObj.body,
      callVars,
      resolvePartExpr,
    );
  }

  return evaluated;
}

/**
 * 評価結果 `DefinyValue` を HTTP `Response` に変換する (`definy-server/src/preview_service.rs` 準拠)
 */
export function definyValueToHttpResponse(
  value: DefinyValue,
  appId: string,
  corsHeaders: Readonly<Record<string, string>>,
): Response {
  const baseHeaders: Record<string, string> = {
    "X-Definy-Preview-App": appId,
    ...corsHeaders,
  };

  if (typeof value === "string") {
    const isHtml = value.includes("<!DOCTYPE") ||
      value.includes("<html") ||
      value.includes("<div") ||
      value.includes("<h1") ||
      value.includes("<main") ||
      value.includes("<body") ||
      value.includes("<svg");
    return new Response(value, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": isHtml
          ? "text/html; charset=utf-8"
          : "text/plain; charset=utf-8",
      },
    });
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !("__variant" in value) &&
    !("__fn" in value)
  ) {
    const rec = value as Record<string, DefinyValue>;
    if (typeof rec.body === "string" && rec.body.length > 0) {
      const status =
        typeof rec.status === "number" && rec.status >= 100 && rec.status <= 599
          ? rec.status
          : 200;
      const contentType = typeof rec.contentType === "string"
        ? rec.contentType
        : typeof rec.content_type === "string"
        ? rec.content_type
        : "text/html; charset=utf-8";
      return new Response(rec.body, {
        status,
        headers: {
          ...baseHeaders,
          "Content-Type": contentType,
        },
      });
    }
  }

  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

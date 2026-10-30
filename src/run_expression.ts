/**
 * 実行パネルで入力した式を stage1 で Wasm にコンパイルして実行する (docs/run-panel.md).
 * 結果が `wasi.io` の値なら, I/O をしながら最後 (`done`) まで動かす
 */
import {
  collectReferencedParts,
  evaluateCompiledWasm,
  type DefinyValue,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";
import {
  isWasiIoValue,
  runWasiIo,
  type WasiIoHost,
  type WasiIoStep,
} from "./wasi_io.ts";
import {
  field,
  isRecord,
  none,
  optionValue,
  some,
  variant,
  variantOf,
  variantPayload,
} from "./definy_value.ts";
import { expressionToTypeAst } from "./tree_layout/part_type.ts";
import {
  floatExpressionFromNumber,
  partReferenceExpression,
} from "./tree_layout/expression.ts";

export type RunOutcome =
  | {
      readonly kind: "value";
      readonly value: DefinyValue;
      /** 値が `wasi.io` だったときに動かした I/O の記録と, `done` のメッセージ */
      readonly wasiIo: {
        readonly steps: ReadonlyArray<WasiIoStep>;
        readonly message: string | null;
      } | null;
      /** 入力した式の型 (`core.type-ast` の値). 結果の表示に使う. 分からなければ無いか `null` */
      readonly type?: unknown;
    }
  /** 参照しているパーツが見つからないか, 式が無いか, コンパイラ組み込み (パーツ ID の並び) */
  | {
      readonly kind: "unresolved_parts";
      readonly partIds: ReadonlyArray<string>;
    }
  | { readonly kind: "error"; readonly message: string };

export type RunExpressionOptions = {
  readonly compiler: Stage1CompilerInstance;
  /** パーツ ID (URL-safe Base64) からパーツの式 (作業中の変更があればそちら). 無ければ `undefined` */
  readonly resolvePart: (partId: string) => unknown;
  /** `wasi.io` を動かすときのホスト. `getPart` は `resolvePart` を使う */
  readonly wasiIoHost: Omit<WasiIoHost, "getPart" | "onStep">;
  /** I/O をするたびに, それまでの記録で呼ぶ (画面に経過を出すため) */
  readonly onProgress?: (steps: ReadonlyArray<WasiIoStep>) => void;
};

export async function runExpression(
  expression: unknown,
  { compiler, resolvePart, wasiIoHost, onProgress }: RunExpressionOptions,
): Promise<RunOutcome> {
  const steps: WasiIoStep[] = [];
  let value: DefinyValue | undefined;
  try {
    const { parts, unresolved } = collectReferencedParts(
      expression,
      resolvePart,
    );
    if (unresolved.length > 0) {
      return { kind: "unresolved_parts", partIds: unresolved };
    }
    const wasm = compiler.compile(expression, parts);
    value = await evaluateCompiledWasm(wasm);
    if (!isWasiIoValue(value)) {
      return { kind: "value", value, wasiIo: null };
    }
    const message = await runWasiIo(
      await WebAssembly.compile(wasm as unknown as BufferSource),
      {
        ...wasiIoHost,
        getPart: resolvePart,
        onStep: (step) => {
          steps.push(step);
          onProgress?.([...steps]);
        },
      },
    );
    return { kind: "value", value, wasiIo: { steps, message } };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // I/O の途中で失敗したときは, そこまでの記録も残す
    return value !== undefined && steps.length > 0
      ? {
          kind: "value",
          value,
          wasiIo: { steps, message: `error: ${message}` },
        }
      : { kind: "error", message };
  }
}

export type RunValueExpressionOptions = {
  /**
   * 式の型 (`core.type-ast` の値). 分からなければ `null`.
   * stage1 から受け取る浮動小数は JavaScript の数なので, 整数の値の浮動小数 (`2.0`) は型が `float` のときだけ見分けられる
   */
  readonly type: unknown;
  /** NaN を表す `core.float-nan` のパーツ ID. 無ければ NaN は式で書けない */
  readonly floatNanPartId: string | undefined;
  /**
   * パーツ ID からパーツの式. 型パーツの参照 (`reference`) と型を返すパーツの呼び出し (`apply`) を
   * 宣言の型に展開して, タグ付きの値のペイロードの型をたどるのに使う. 分からなければ `undefined`
   */
  readonly resolvePart: (partId: string) => unknown;
};

/** 型パーツの展開を繰り返す上限 (`A = B`, `B = A` のような循環で止まらないように) */
const MAX_TYPE_RESOLVE_DEPTH = 32;

/**
 * 型 (`core.type-ast` の値) が型パーツの参照か型を返すパーツの呼び出しなら, 宣言の型に展開する.
 * 型を返すパーツ `(T) => union {...}` は, 本体の引数の変数を呼び出しの型引数にした型にする.
 * 展開できなければ `null`
 */
export function resolveRunValueType(
  type: unknown,
  resolvePart: (partId: string) => unknown,
): unknown {
  let current = type;
  for (let depth = 0; depth < MAX_TYPE_RESOLVE_DEPTH; depth += 1) {
    const tagged = variantOf(current);
    if (tagged?.tag === "reference") {
      const partId = field(tagged.payload, "part_hash");
      if (typeof partId !== "string") {
        return null;
      }
      current = expressionToTypeAst(resolvePart(partId));
      continue;
    }
    if (tagged?.tag === "apply") {
      const partId = field(tagged.payload, "part_hash");
      const declaration = variantPayload(
        typeof partId === "string" ? resolvePart(partId) : undefined,
        "function",
      );
      if (declaration === undefined) {
        return null;
      }
      const args = field(tagged.payload, "arguments");
      const parameters = field(declaration, "parameters");
      // 引数の変数を, 型をそのまま持つ `unknown_part_type` の式に置き換えてから型にする
      const argumentTypes = new Map<unknown, unknown>(
        (Array.isArray(parameters) ? parameters : []).map((parameter) => [
          field(parameter, "parameter_id"),
          field(
            (Array.isArray(args) ? args : []).find(
              (arg) =>
                field(arg, "name") === field(parameter, "parameter_name"),
            ),
            "type",
          ) ?? null,
        ]),
      );
      current = expressionToTypeAst(
        substituteVariables(field(declaration, "body"), argumentTypes),
      );
      continue;
    }
    return current;
  }
  return null;
}

/** 式の中の変数 `variable_id` を, `types` の型をそのまま持つ `unknown_part_type` の式にする */
function substituteVariables(
  expression: unknown,
  types: ReadonlyMap<unknown, unknown>,
): unknown {
  const variableId = field(
    variantPayload(expression, "variable"),
    "variable_id",
  );
  if (variableId !== undefined && types.has(variableId)) {
    return variant("unknown_part_type", types.get(variableId));
  }
  if (Array.isArray(expression)) {
    return expression.map((item) => substituteVariables(item, types));
  }
  if (typeof expression === "object" && expression !== null) {
    return Object.fromEntries(
      Object.entries(expression).map(([key, item]) => [
        key,
        substituteVariables(item, types),
      ]),
    );
  }
  return expression;
}

/**
 * 結果の値を, それに評価される式 (`core.expression` の値) にする. 実行パネルは入力と同じ式のツリーで結果を表示する.
 * 型が `float` の数と整数でない数は浮動小数のリテラル, NaN は `core.float-nan` の参照にする.
 * 型はリストの要素・レコードのフィールド・直和型のタグのペイロードとたどり, 型パーツは宣言に展開する.
 * 式で書けない値 (関数, `null`, ±Infinity) を含むときは `null`
 */
export function runValueExpression(
  value: DefinyValue,
  options: RunValueExpressionOptions,
): unknown {
  const type = variantOf(
    resolveRunValueType(options.type, options.resolvePart),
  );
  const typePayload = type?.payload;
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return options.floatNanPartId === undefined
        ? null
        : partReferenceExpression(options.floatNanPartId);
    }
    return Number.isInteger(value) && type?.tag !== "float"
      ? variant("number", value)
      : floatExpressionFromNumber(value);
  }
  if (typeof value === "string") {
    return variant("string", value);
  }
  if (typeof value === "boolean") {
    return variant("boolean", value);
  }
  if (value === null || "__closure" in value) {
    return null;
  }
  if (Array.isArray(value)) {
    const itemType =
      type?.tag === "list" ? field(typePayload, "item_type") : null;
    const items = value.map((item) =>
      runValueExpression(item, { ...options, type: itemType ?? null }),
    );
    return items.includes(null) ? null : variant("list", items);
  }
  const tagged = variantOf(value);
  if (tagged !== undefined) {
    if (tagged.payload === null) {
      return variant("variant", {
        tag: tagged.tag,
        payload: none(),
        type_part: none(),
      });
    }
    // 直和型ならタグのペイロードの型 (`payload_type` の `some`) をたどる
    const payloadType =
      type?.tag === "union" && Array.isArray(typePayload)
        ? optionValue(
            field(
              typePayload.find((item) => field(item, "tag") === tagged.tag),
              "payload_type",
            ),
          )
        : undefined;
    const payload = runValueExpression(tagged.payload as DefinyValue, {
      ...options,
      type: payloadType ?? null,
    });
    return payload === null
      ? null
      : variant("variant", {
          tag: tagged.tag,
          payload: some(payload),
          type_part: none(),
        });
  }
  if (!isRecord(value)) {
    return null;
  }
  const fieldTypes = type?.tag === "record" ? typePayload : null;
  const fields = Object.entries(value).map(([key, item]) => ({
    key,
    value: runValueExpression(item as DefinyValue, {
      ...options,
      type: Array.isArray(fieldTypes)
        ? (field(
            fieldTypes.find((f) => field(f, "key") === key),
            "field_type",
          ) ?? null)
        : null,
    }),
  }));
  return fields.some((item) => item.value === null)
    ? null
    : variant("record", fields);
}

/** 結果の値を画面に出す文字列にする (式のツリーで表示できない値のとき) */
export function formatRunValue(value: DefinyValue): string {
  if (value === null) return "null";
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/** I/O の記録 1 つを 1 行にする */
export function formatWasiIoStep(step: WasiIoStep): string {
  switch (step.kind) {
    case "get_parts":
      return `get_parts: ${step.found} 個${step.missing.length > 0 ? ` (見つからない: ${step.missing.join(", ")})` : ""}`;
    case "outgoing_request":
      return `${step.method} ${step.url} (${step.bodyBytes} bytes${step.secrets.length > 0 ? `, シークレット: ${step.secrets.join(", ")}` : ""}) → ${"error" in step.result ? `エラー: ${step.result.error}` : step.result.status}`;
  }
}

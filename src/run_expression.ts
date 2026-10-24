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

export type RunOutcome =
  | {
      readonly kind: "value";
      readonly value: DefinyValue;
      /** 値が `wasi.io` だったときに動かした I/O の記録と, `done` のメッセージ */
      readonly wasiIo: {
        readonly steps: ReadonlyArray<WasiIoStep>;
        readonly message: string | null;
      } | null;
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

/** 結果の値を画面に出す文字列にする */
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

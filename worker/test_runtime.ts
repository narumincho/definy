/**
 * テスト用: seed バンドルとランタイムモジュールを読み込む。
 */
import { readFile } from "node:fs/promises";
import { setDefinyRuntimeModule } from "./definy_runtime.ts";

const seedBundleUrl = new URL("../seeds/seed_bundle.json", import.meta.url);
const runtimeWasmUrl = new URL(
  "./generated/definy_worker_runtime.wasm",
  import.meta.url,
);

/** `setDefinyRuntimeModule` にビルド済みのランタイムを設定する */
export async function setupTestRuntime(): Promise<void> {
  try {
    const bytes = await readFile(runtimeWasmUrl);
    setDefinyRuntimeModule(new WebAssembly.Module(bytes));
  } catch {
    // definy_worker_runtime.wasm が存在しない場合はスキップ (stage1.wasm を使用)
  }
}

/** 開発用システムアカウントの seed バンドル */
export interface TestSeedBundle {
  readonly events: ReadonlyArray<{
    readonly eventHash: string;
    readonly signedEventBytes: string;
    readonly accountId: string;
    readonly eventType: string;
    readonly createdAtRfc3339: string;
    readonly timeMs: number;
  }>;
  readonly contents: ReadonlyArray<{
    readonly contentHash: string;
    readonly contentBytes: string;
  }>;
}

export async function loadTestSeedBundle(): Promise<TestSeedBundle> {
  const text = await readFile(seedBundleUrl, "utf-8");
  return JSON.parse(text) as TestSeedBundle;
}

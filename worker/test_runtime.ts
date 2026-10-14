/**
 * テスト用: ビルド済みの `definy-worker-runtime` と、Rust が生成した seed バンドルを読み込む。
 *
 * 事前に次を実行しておく（CI の `pull_request.yaml` も同じ手順）:
 *
 * ```sh
 * cargo build -p definy-worker-runtime --release --target wasm32-unknown-unknown
 * cp target/wasm32-unknown-unknown/release/definy_worker_runtime.wasm worker/generated/
 * cargo run -p definy-server -- --export-seed-bundle worker/generated/test_seed_bundle.json
 * ```
 */
import { setDefinyRuntimeModule } from "./definy_runtime.ts";

const generatedDir = new URL("./generated/", import.meta.url);

/** `setDefinyRuntimeModule` にビルド済みのランタイムを設定する */
export async function setupTestRuntime(): Promise<void> {
  const bytes = await Deno.readFile(
    new URL("definy_worker_runtime.wasm", generatedDir),
  );
  setDefinyRuntimeModule(new WebAssembly.Module(bytes));
}

/** Rust（`--export-seed-bundle`）が生成した、開発用システムアカウントの seed バンドル */
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
  return JSON.parse(
    await Deno.readTextFile(new URL("test_seed_bundle.json", generatedDir)),
  ) as TestSeedBundle;
}

/**
 * テスト用: seed バンドルを読み込む。
 * バンドルは Vitest の起動時に `src/test_global_setup.ts` が生成する
 */
import { readFile } from "node:fs/promises";

const seedBundleUrl = new URL(
  "../public/__definy_seed_bundle.json",
  import.meta.url,
);

/** 開発用システムアカウントの seed バンドル */
export type TestSeedBundle = {
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
};

export async function loadTestSeedBundle(): Promise<TestSeedBundle> {
  const text = await readFile(seedBundleUrl, "utf-8");
  return JSON.parse(text) as TestSeedBundle;
}

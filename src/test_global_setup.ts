/**
 * Vitest の起動時に 1 度だけ seed から作るもの (コミットしていない) を生成する.
 * テストは `public/__definy_seed_bundle.json` と `wasm/type_checker.wasm` を読む
 */
import {
  writeSeedBundle,
  writeTypeCheckerWasm,
} from "../scripts/generate_seed_bundle.ts";

export default async function setup(): Promise<void> {
  await writeSeedBundle();
  await writeTypeCheckerWasm();
}

/**
 * Vitest の起動時に 1 度だけ seed バンドルを生成する (コミットしていないため).
 * テストは `public/__definy_seed_bundle.json` を読む
 */
import { writeSeedBundle } from "../scripts/generate_seed_bundle.ts";

export default async function setup(): Promise<void> {
  await writeSeedBundle();
}

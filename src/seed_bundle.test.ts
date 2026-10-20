import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateSeedBundle,
  SEED_FINGERPRINT_PATH,
} from "../scripts/generate_seed_bundle.ts";
import { seedBundleFingerprint } from "./seed_fingerprint.ts";

describe("generateSeedBundle", () => {
  it("is deterministic and matches the committed fingerprint", async () => {
    const generated = await generateSeedBundle();
    expect(generated.fingerprint).toBe(
      await seedBundleFingerprint({
        events: generated.events,
        contents: generated.contents,
      }),
    );
    // 指紋は Worker が取り込むのでコミットしている. seeds/*.json を変えたら `npm run build:seeds` で更新する
    const fingerprintFile = JSON.parse(
      await readFile(resolve(SEED_FINGERPRINT_PATH), "utf-8"),
    ) as { readonly fingerprint: string };
    expect(fingerprintFile.fingerprint).toBe(generated.fingerprint);
    // デプロイするパーツの handler を stage1 で事前にコンパイルするので少し時間がかかる
  }, 30_000);
});

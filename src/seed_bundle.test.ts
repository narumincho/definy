import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateSeedBundle } from "../scripts/generate_seed_bundle.ts";
import type { SeedBundle } from "../worker/types.ts";
import { seedBundleFingerprint } from "./seed_fingerprint.ts";

describe("generateSeedBundle", () => {
  it("generates a seed bundle matching seeds/seed_bundle.json", async () => {
    const generated = await generateSeedBundle();
    const existingRaw = await readFile(
      resolve("seeds/seed_bundle.json"),
      "utf-8",
    );
    const existing = JSON.parse(existingRaw) as SeedBundle;

    expect(generated.events.length).toBe(existing.events.length);
    expect(generated.contents.length).toBe(existing.contents.length);

    expect(generated.events).toEqual(existing.events);
    expect(generated.contents).toEqual(existing.contents);
    // デプロイするパーツの handler を stage1 で事前にコンパイルするので少し時間がかかる
  }, 30_000);

  it("seeds/seed_bundle_fingerprint.json matches the seed bundle", async () => {
    const bundle = JSON.parse(
      await readFile(resolve("seeds/seed_bundle.json"), "utf-8"),
    ) as SeedBundle;
    const fingerprintFile = JSON.parse(
      await readFile(resolve("seeds/seed_bundle_fingerprint.json"), "utf-8"),
    ) as { readonly fingerprint: string };
    expect(fingerprintFile.fingerprint).toBe(bundle.fingerprint);
    expect(bundle.fingerprint).toBe(
      await seedBundleFingerprint({
        events: bundle.events,
        contents: bundle.contents,
      }),
    );
  });

  it("public/__definy_seed_bundle.json is identical to seeds/seed_bundle.json", async () => {
    const seedsRaw = await readFile(resolve("seeds/seed_bundle.json"), "utf-8");
    const publicRaw = await readFile(
      resolve("public/__definy_seed_bundle.json"),
      "utf-8",
    );
    expect(publicRaw).toBe(seedsRaw);
  });
});

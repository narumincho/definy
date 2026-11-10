import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateAccountCredentials } from "./auth.ts";
import { commitStoreSeedProject } from "./store_commit.ts";
import { STORE_SEED_DIR } from "./store_seed.ts";

describe("commitStoreSeedProject", () => {
  it("変わらなければコミットせず, main の作者でない鍵では変えられない", async () => {
    const dir = await mkdtemp(join(tmpdir(), "definy-store-commit-"));
    try {
      await cp(STORE_SEED_DIR, dir, { recursive: true });
      const credentials = await generateAccountCredentials("someone");
      expect(
        await commitStoreSeedProject({
          projectName: "sample",
          message: "nothing",
          update: (modules) => modules,
          dir,
          credentials,
        }),
      ).toBeUndefined();
      await expect(
        commitStoreSeedProject({
          projectName: "sample",
          message: "add",
          update: (modules) =>
            modules.map((module) => ({
              ...module,
              parts: [
                ...module.parts,
                {
                  name: "store-commit-test",
                  description: [],
                  partType: { "#type_number": null },
                  expression: { "#number": 1 },
                },
              ],
            })),
          dir,
          credentials,
        }),
      ).rejects.toThrow("the main commit is by");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

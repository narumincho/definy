import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("stage1 fixed point", () => {
  it("regenerates stage1.wasm and verifies fixed point", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/regenerate_stage1.ts", "--check"],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(
        `stage1 fixed point check failed with exit code ${result.status}:\n` +
          `stdout:\n${result.stdout}\n` +
          `stderr:\n${result.stderr}`,
      );
    }
    expect(result.status).toBe(0);
  }, 60_000);

  it("public/stage1.wasm is identical to wasm/stage1.wasm", () => {
    expect(
      Buffer.from(readFileSync("public/stage1.wasm")).equals(
        readFileSync("wasm/stage1.wasm"),
      ),
    ).toBe(true);
  });
});

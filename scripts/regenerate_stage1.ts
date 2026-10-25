/**
 * `seeds/*.json` の definy 製コンパイラ (`core.compile-to-wasm`) を今の `wasm/stage1.wasm` でコンパイルし直し (stage2),
 * stage2 で同じ入力をコンパイルした stage3 と一致する (不動点) ことを確かめる (src/compiler_rebuild.ts).
 * `--check` のときは stage2 が今の `wasm/stage1.wasm` と一致するかを確かめ, 引数なしのときは書き出す.
 * `--bootstrap` のときは, コンパイラの出力を変えたとき (古い stage1 で作った stage2 は古い出力をする) のために,
 * 不動点に達するまでできたコンパイラで自分自身をコンパイルし直す (`npm run build:stage1 -- --bootstrap`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { areBytesEqual, selfCompile } from "../src/compiler_rebuild.ts";
import { loadSeedPartExpressions } from "../src/seed_parts.ts";

const seedPartExpressions = await loadSeedPartExpressions();

const MAX_BOOTSTRAP_ROUNDS = 5;
const isBootstrap = process.argv.includes("--bootstrap");
const isCheckMode = process.argv.includes("--check");

const currentWasmPath = "wasm/stage1.wasm";
const currentWasmBytes = new Uint8Array(readFileSync(currentWasmPath));

const result = selfCompile({
  compiler: currentWasmBytes,
  resolvePart: (id) => seedPartExpressions.get(id),
  maxRounds: isBootstrap ? MAX_BOOTSTRAP_ROUNDS : 1,
});

switch (result.kind) {
  case "unresolved_parts":
    console.error(
      `Unresolved parts found (${result.partIds.length}): ${result.partIds.join(", ")}`,
    );
    process.exit(1);
    break;
  case "not_fixed_point":
    console.error(
      `Fixed point verification failed: the last two compilers differ (${result.sizes[0]} and ${result.sizes[1]} bytes).` +
        (isBootstrap
          ? ""
          : " If the compiler output changed, use --bootstrap."),
    );
    process.exit(1);
    break;
  case "fixed_point":
    console.log(
      `Compiled core.compile-to-wasm (${result.partCount} referenced parts) ${result.rounds + 1} times: ${result.compiler.length} bytes at fixed point.`,
    );
    if (isCheckMode) {
      if (!areBytesEqual(result.compiler, currentWasmBytes)) {
        console.error(
          `stage2 does not match existing ${currentWasmPath}. Sizes: stage2=${result.compiler.length}, existing=${currentWasmBytes.length}`,
        );
        process.exit(1);
      }
      console.log(
        `Check passed: stage2 matches existing ${currentWasmPath} and reaches a fixed point.`,
      );
    } else {
      writeFileSync(currentWasmPath, result.compiler);
      console.log(`Successfully regenerated ${currentWasmPath}.`);
    }
    break;
}

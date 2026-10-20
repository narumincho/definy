/**
 * `seeds/*.json` の definy 製コンパイラ (`core.compile-to-wasm`) を今の `wasm/stage1.wasm` でコンパイルし直し (stage2),
 * stage2 で同じ入力をコンパイルした stage3 と一致する (不動点) ことを確かめる.
 * `--check` のときは stage2 が今の `wasm/stage1.wasm` と一致するかを確かめ, 引数なしのときは書き出す.
 * `--bootstrap` のときは, コンパイラの出力を変えたとき (古い stage1 で作った stage2 は古い出力をする) のために,
 * 不動点に達するまでできたコンパイラで自分自身をコンパイルし直す (`npm run build:stage1 -- --bootstrap`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "../src/seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
} from "../src/stage1_compiler.ts";

function areBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

const compileToWasmPlaceholder = {
  PartReference: {
    part_definition_event_hash: {
      $part: "core.compile-to-wasm",
    },
  },
};

const expression = await resolvePartPlaceholders(
  compileToWasmPlaceholder,
  accountBytes,
);

const { parts, unresolved } = collectReferencedParts(expression, (id) =>
  seedPartExpressions.get(id),
);

if (unresolved.length > 0) {
  console.error(
    `Unresolved parts found (${unresolved.length}): ${unresolved.join(", ")}`,
  );
  process.exit(1);
}

const currentWasmPath = "wasm/stage1.wasm";
const currentWasmBytes = readFileSync(currentWasmPath);
/** `compilerBytes` のコンパイラでコンパイラ自身をコンパイルする */
function compileCompiler(compilerBytes: Uint8Array): Uint8Array {
  return createStage1Compiler(new WebAssembly.Module(compilerBytes)).compile(
    expression,
    parts,
  );
}

const MAX_BOOTSTRAP_ROUNDS = 5;
const isBootstrap = process.argv.includes("--bootstrap");

console.log(
  `Compiling stage2 with current stage1 (${parts.length} referenced parts)...`,
);
let stage2Bytes = compileCompiler(currentWasmBytes);
console.log(`stage2 generated: ${stage2Bytes.length} bytes`);

console.log("Compiling stage3 with stage2 to verify fixed point...");
let stage3Bytes = compileCompiler(stage2Bytes);
console.log(`stage3 generated: ${stage3Bytes.length} bytes`);

for (
  let round = 1;
  isBootstrap &&
  !areBytesEqual(stage2Bytes, stage3Bytes) &&
  round < MAX_BOOTSTRAP_ROUNDS;
  round++
) {
  stage2Bytes = stage3Bytes;
  stage3Bytes = compileCompiler(stage2Bytes);
  console.log(
    `bootstrap round ${round}: stage${round + 3} generated: ${stage3Bytes.length} bytes`,
  );
}

if (!areBytesEqual(stage2Bytes, stage3Bytes)) {
  console.error(
    "Fixed point verification failed: stage3 does not match stage2." +
      (isBootstrap ? "" : " If the compiler output changed, use --bootstrap."),
  );
  process.exit(1);
}

const isCheckMode = process.argv.includes("--check");

if (isCheckMode) {
  if (!areBytesEqual(stage2Bytes, currentWasmBytes)) {
    console.error(
      `stage2 does not match existing ${currentWasmPath}. Sizes: stage2=${stage2Bytes.length}, existing=${currentWasmBytes.length}`,
    );
    const minLength = Math.min(stage2Bytes.length, currentWasmBytes.length);
    for (let i = 0; i < minLength; i++) {
      if (stage2Bytes[i] !== currentWasmBytes[i]) {
        console.error(
          `First byte difference at offset ${i} (0x${i.toString(16)}): stage2=0x${stage2Bytes[i]?.toString(16).padStart(2, "0")}, existing=0x${currentWasmBytes[i]?.toString(16).padStart(2, "0")}`,
        );
        break;
      }
    }
    if (stage2Bytes.length !== currentWasmBytes.length) {
      console.error(
        `Buffers diverge at end of shorter buffer, offset ${minLength}`,
      );
    }
    process.exit(1);
  }
  console.log(
    `Check passed: stage2 matches existing ${currentWasmPath} (${stage2Bytes.length} bytes) and reaches a fixed point.`,
  );
} else {
  writeFileSync(currentWasmPath, stage2Bytes);
  console.log(
    `Successfully regenerated ${currentWasmPath} (${stage2Bytes.length} bytes) at fixed point.`,
  );
}

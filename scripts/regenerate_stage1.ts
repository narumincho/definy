/**
 * `seeds/*.json` の definy 製コンパイラ (`core.compile-to-wasm`) を今の `wasm/stage1.wasm` でコンパイルし直し (stage2),
 * stage2 で同じ入力をコンパイルした stage3 と一致する (不動点) ことを確かめる.
 * `--check` のときは stage2 が今の `wasm/stage1.wasm` と一致するかを確かめ, 引数なしのときは書き出す.
 * stage1 内部の再帰が深いので `node --stack-size=4000` で動かす (`npm run build:stage1` / `npm run check:stage1`)
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
const stage1Compiler = createStage1Compiler(
  new WebAssembly.Module(currentWasmBytes),
);

console.log(
  `Compiling stage2 with current stage1 (${parts.length} referenced parts)...`,
);
const stage2Bytes = stage1Compiler.compile(expression, parts);
console.log(`stage2 generated: ${stage2Bytes.length} bytes`);

console.log("Compiling stage3 with stage2 to verify fixed point...");
const stage2Compiler = createStage1Compiler(
  new WebAssembly.Module(stage2Bytes),
);
const stage3Bytes = stage2Compiler.compile(expression, parts);
console.log(`stage3 generated: ${stage3Bytes.length} bytes`);

if (!areBytesEqual(stage2Bytes, stage3Bytes)) {
  console.error(
    "Fixed point verification failed: stage3 does not match stage2.",
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

/**
 * stage1 のコンパイルを大きなスタックの worker thread で動かす.
 * stage1 の内部の再帰は深く, `sample.self-hosted-definy-server` のような大きな式は Node.js の既定のスタックで足りない.
 * `node --stack-size` はメインスレッドの OS のスタック (多くの環境で 8MB) を超えると落ちるので,
 * `resourceLimits.stackSizeMb` でスタックを確保できる worker thread を使う
 */
import { readFileSync } from "node:fs";
import {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} from "node:worker_threads";
import {
  createStage1Compiler,
  type Stage1ReferencedPart,
} from "../src/stage1_compiler.ts";

type CompileInput = {
  readonly expression: unknown;
  readonly parts: ReadonlyArray<Stage1ReferencedPart>;
};

const STACK_SIZE_MB = 64;

/** `wasm/stage1.wasm` で式をコンパイルする (大きなスタックの worker thread で動かす) */
export function compileWithStage1InWorker(
  input: CompileInput,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: input,
      resourceLimits: { stackSizeMb: STACK_SIZE_MB },
    });
    worker.once("message", (bytes: Uint8Array) => resolve(bytes));
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`stage1 compile worker exited with code ${code}`));
      }
    });
  });
}

if (!isMainThread && parentPort) {
  const { expression, parts } = workerData as CompileInput;
  const stage1 = createStage1Compiler(
    new WebAssembly.Module(
      readFileSync(new URL("../wasm/stage1.wasm", import.meta.url)),
    ),
  );
  parentPort.postMessage(stage1.compile(expression, parts));
}

/**
 * definy 製コンパイラ (`core.compile-to-wasm`) を, 今のコンパイラで自分自身をコンパイルし直して作り直す (docs/self-hosting.md).
 * できたコンパイラでもう 1 度コンパイルし, 同じバイト列になる (不動点) ことを確かめる.
 * `npm run build:stage1` (seed のパーツから) と, 実行パネルの「コンパイラを作り直す」(表示中のパーツから) が使う
 */
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { variant } from "./definy_value.ts";
import { compileTypeChecker } from "./self_hosted_type_check.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  type Stage1ReferencedPart,
} from "./stage1_compiler.ts";

const CORE_MODULE_ID = deriveModuleIdBytes("core");

/** `core.compile-to-wasm` のパーツ ID */
export const COMPILE_TO_WASM_PART_ID = deriveModulePartId(
  CORE_MODULE_ID,
  "compile-to-wasm",
);

/** `core.type-checker` のパーツ ID */
const TYPE_CHECKER_PART_ID = deriveModulePartId(CORE_MODULE_ID, "type-checker");

type SelfCompileResult =
  | {
      readonly kind: "fixed_point";
      /** 不動点のコンパイラ (自分自身をコンパイルすると同じバイト列になる) */
      readonly compiler: Uint8Array;
      /** 自分自身をコンパイルした回数 (確かめた 1 回を含む) */
      readonly rounds: number;
      /** `core.compile-to-wasm` が参照するパーツの数 */
      readonly partCount: number;
    }
  /** 参照しているパーツが見つからないか, 式が無いか, コンパイラ組み込み (パーツ ID の並び) */
  | {
      readonly kind: "unresolved_parts";
      readonly partIds: ReadonlyArray<string>;
    }
  /** `maxRounds` 回コンパイルし直しても不動点にならなかった. 最後の 2 つの大きさ */
  | {
      readonly kind: "not_fixed_point";
      readonly sizes: readonly [number, number];
    };

/**
 * `compiler` (コンパイラの Wasm) で `core.compile-to-wasm` をコンパイルし (stage2), stage2 でもう 1 度コンパイルして
 * 一致するかを確かめる. 一致しなければ, できたコンパイラで最大 `maxRounds` 回までコンパイルし直す
 * (コンパイラの出力を変えたとき, 古いコンパイラで作った stage2 は古い出力をするため)
 */
export function selfCompile(options: {
  readonly compiler: Uint8Array;
  /** パーツ ID からパーツの式. 無ければ `undefined` */
  readonly resolvePart: (partId: string) => unknown;
  readonly maxRounds: number;
}): SelfCompileResult {
  const expression = variant("part_reference", {
    part_definition_event_hash: COMPILE_TO_WASM_PART_ID,
  });
  const { parts, unresolved } = collectReferencedParts(
    expression,
    options.resolvePart,
  );
  if (unresolved.length > 0) {
    return { kind: "unresolved_parts", partIds: unresolved };
  }
  const compileWith = (compiler: Uint8Array): Uint8Array =>
    compileCompiler(compiler, expression, parts);
  let previous = compileWith(options.compiler);
  for (let round = 1; round <= options.maxRounds; round++) {
    const next = compileWith(previous);
    if (areBytesEqual(previous, next)) {
      return {
        kind: "fixed_point",
        compiler: next,
        rounds: round,
        partCount: parts.length,
      };
    }
    if (round === options.maxRounds) {
      return { kind: "not_fixed_point", sizes: [previous.length, next.length] };
    }
    previous = next;
  }
  throw new Error("maxRounds must be 1 or more");
}

function compileCompiler(
  compiler: Uint8Array,
  expression: unknown,
  parts: ReadonlyArray<Stage1ReferencedPart>,
): Uint8Array {
  return createStage1Compiler(
    new WebAssembly.Module(compiler as unknown as BufferSource),
  ).compile(expression, parts);
}

/** `compiler` で `core.type-checker` をコンパイルする */
export function compileTypeCheckerWith(
  compiler: Uint8Array,
  resolvePart: (partId: string) => unknown,
): Uint8Array {
  return compileTypeChecker({
    compiler: createStage1Compiler(
      new WebAssembly.Module(compiler as unknown as BufferSource),
    ),
    core: { typeChecker: TYPE_CHECKER_PART_ID },
    resolvePart,
  });
}

export function areBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
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

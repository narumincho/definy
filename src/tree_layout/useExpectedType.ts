import { useEffect, useRef, useState, type RefObject } from "react";
import type { DefinyValue } from "../stage1_compiler.ts";
import type { PartSnapshot } from "../types.ts";
import { isVariableNamePath } from "./local_variable.ts";
import {
  isMatchPatternPath,
  patternVariantsFromTypeAst,
  probeMatchTargetType,
  type PatternVariant,
} from "./match_pattern.ts";
import {
  expectedTypeFromTypeAst,
  probeExpressionAt,
  type ExpectedType,
  type TypeQuery,
} from "./type_inference.ts";
import type { PathStep } from "./types.ts";
import { expectedVariantsFromTypeAst } from "./variant.ts";

const NO_EXPECTED_VARIANTS = expectedVariantsFromTypeAst(null);

/**
 * 選んだ位置で期待する型. その位置を未入力 (probe) にした式を definy 製の型チェッカーで検査して求める.
 * match のアームのパターンを選んだときは, 代わりに match の対象の型を聞いてパターンで選べるタグにする
 */
export function useExpectedType({
  expression,
  selectedPath,
  partType,
  mode,
  findExpectedType,
  partsByIdHash,
}: {
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly partType: unknown;
  readonly mode: "expression" | "type";
  readonly findExpectedType: TypeQuery;
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
}): {
  readonly expectedType: ExpectedType;
  readonly expectedTypeAst: DefinyValue | null;
  readonly patternVariants: ReadonlyArray<PatternVariant> | null;
  readonly expectedVariants: ReturnType<typeof expectedVariantsFromTypeAst>;
  /**
   * 期待する型の問い合わせ (選んだ位置が変わるたびに作り直す).
   * 型が届く前に選択肢を選んでも, 届くのを待ってから置き換えるのに使う
   */
  readonly expectedTypeRef: RefObject<Promise<DefinyValue | null>>;
} {
  const [expectedType, setExpectedType] = useState<ExpectedType>("any");
  const [expectedTypeAst, setExpectedTypeAst] = useState<DefinyValue | null>(
    null,
  );
  const [patternVariants, setPatternVariants] =
    useState<ReadonlyArray<PatternVariant> | null>(null);
  const [expectedVariants, setExpectedVariants] =
    useState(NO_EXPECTED_VARIANTS);
  const expectedTypeRef = useRef<Promise<DefinyValue | null>>(
    Promise.resolve(null),
  );
  useEffect(() => {
    expectedTypeRef.current = Promise.resolve(null);
    setExpectedType("any");
    setExpectedTypeAst(null);
    setPatternVariants(null);
    setExpectedVariants(NO_EXPECTED_VARIANTS);
    if (!selectedPath || mode === "type" || partType == null) {
      return;
    }
    // 名前は式ではないので期待する型は無い
    if (isVariableNamePath(selectedPath)) {
      return;
    }
    const isPattern = isMatchPatternPath(selectedPath);
    let cancelled = false;
    const typePromise = findExpectedType({
      partType,
      expression: isPattern
        ? probeMatchTargetType(expression, selectedPath)
        : probeExpressionAt(expression, selectedPath),
    });
    if (!isPattern) {
      expectedTypeRef.current = typePromise.catch(() => null);
    }
    typePromise.then(
      (type) => {
        if (cancelled) {
          return;
        }
        if (isPattern) {
          setPatternVariants(patternVariantsFromTypeAst(type, partsByIdHash));
        } else {
          setExpectedType(expectedTypeFromTypeAst(type));
          setExpectedTypeAst(type);
          setExpectedVariants(expectedVariantsFromTypeAst(type));
        }
      },
      (e: unknown) => {
        console.error("failed to find the expected type", e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    expression,
    selectedPath,
    partType,
    mode,
    findExpectedType,
    partsByIdHash,
  ]);

  return {
    expectedType,
    expectedTypeAst,
    patternVariants,
    expectedVariants,
    expectedTypeRef,
  };
}

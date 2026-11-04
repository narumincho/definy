import { useEffect, useMemo, useState } from "react";
import type { DefinyValue } from "../stage1_compiler.ts";
import type { PartSnapshot } from "../types.ts";
import { expressionToLayoutNode } from "./engine.ts";
import { collectNodeIndex } from "./selection.ts";
import { probeExpressionAt, type TypeQuery } from "./type_inference.ts";
import { typeArgumentHoles, typeAstText } from "./type_argument_inference.ts";
import { pathToString } from "./types.ts";

/** 編集が止まってから型引数を推論するまでの時間 */
const INFER_DELAY_MS = 300;

/**
 * 未入力の型引数の推論した型 (値のパス → core.type-ast) と, 枠に出す型の文字列.
 * 推論は型チェッカー (`core.type-infer-type-argument`) がする. 式が変わったら, 編集が少し止まってから推論し直す
 * (docs/type-arguments.md「エディタ」)
 */
export function useInferredTypeArguments({
  expression,
  partType,
  mode,
  partNames,
  partsByIdHash,
  findInferredTypeArgument,
}: {
  readonly expression: unknown;
  readonly partType: unknown;
  readonly mode: "expression" | "type";
  readonly partNames: ReadonlyMap<string, string>;
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly findInferredTypeArgument: TypeQuery;
}): {
  /** 値のパス (`pathToString`) → 推論した型 */
  readonly types: ReadonlyMap<string, DefinyValue>;
  /** 値のパス (`pathToString`) → 枠に出す型の文字列 */
  readonly holeHints: ReadonlyMap<string, string>;
} {
  const [inferred, setInferred] = useState<{
    readonly expression: unknown;
    readonly types: ReadonlyMap<string, DefinyValue>;
  } | null>(null);
  const types = useMemo(
    () =>
      inferred !== null && inferred.expression === expression
        ? inferred.types
        : new Map<string, DefinyValue>(),
    [inferred, expression],
  );
  const holeHints = useMemo(
    () =>
      new Map(
        [...types].map(([path, type]) => [path, typeAstText(type, partNames)]),
      ),
    [types, partNames],
  );

  useEffect(() => {
    if (mode === "type" || partType == null) {
      return;
    }
    // 調べる位置は式の全ノードのパス (推論した型を枠に出すとツリーが変わるので, 表示中のツリーは使わない)
    const holes = typeArgumentHoles(
      expression,
      collectNodeIndex(expressionToLayoutNode(expression)).map(
        (entry) => entry.path,
      ),
      (id) => partsByIdHash.get(id)?.partType,
    );
    if (holes.length === 0) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // 枠を probe にして推論した型引数を聞く
      (async () => {
        const result = new Map<string, DefinyValue>();
        for (const hole of holes) {
          const type = await findInferredTypeArgument({
            partType,
            expression: probeExpressionAt(expression, hole.path),
          });
          if (type !== null) {
            result.set(pathToString(hole.path), type);
          }
        }
        return result;
      })().then(
        (result) => {
          if (!cancelled) {
            setInferred({ expression, types: result });
          }
        },
        (e: unknown) => {
          console.error("failed to infer the type arguments", e);
        },
      );
    }, INFER_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expression, mode, partType, partsByIdHash, findInferredTypeArgument]);

  return { types, holeHints };
}

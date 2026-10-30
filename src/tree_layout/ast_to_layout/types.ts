import type { LayoutNode, PathStep } from "../types.ts";

export type ScopeContext = {
  readonly partNames?: ReadonlyMap<string, string>;
  readonly scopeVariables?: ReadonlyMap<number, string>;
  /** 型のツリーエディタで参照できる型引数 (関数の型の引数で型が type のもの) の名前 */
  readonly typeParameters?: ReadonlyArray<string>;
  /** パーツ ID → そのパーツ (関数) の引数名 (宣言の順). 呼び出しの引数をこの順に表示する */
  readonly callParameterNames?: ReadonlyMap<string, ReadonlyArray<string>>;
  /** 未入力の位置 (`pathToString`) → 枠に薄く出す補足 (推論した型引数. type_argument_inference.ts) */
  readonly holeHints?: ReadonlyMap<string, string>;
};

export type BuildLayoutNodeFn = (
  expr: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
) => LayoutNode;

export function childPath(
  base: ReadonlyArray<PathStep>,
  step: PathStep,
): ReadonlyArray<PathStep> {
  return [...base, step];
}

import type { LayoutNode, PathStep } from "../types.ts";

export type ScopeContext = {
  readonly partNames?: ReadonlyMap<string, string>;
  readonly scopeVariables?: ReadonlyMap<number, string>;
  readonly callParameterNames?: ReadonlyMap<string, ReadonlyArray<string>>;
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

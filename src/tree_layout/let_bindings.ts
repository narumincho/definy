/**
 * let の束縛の追加・削除・並び替え.
 * let そのもの, または束縛の値を選んだときの置換メニューに操作の選択肢を出す (リストの要素の操作と同じやり方)
 */
import type { SelectorOption } from "./selector_options.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { nextVariableId } from "./selection.ts";
import type { PathStep } from "./types.ts";

/** 置換メニューの選択肢の value */
export const LET_APPEND_BINDING = "let:append";
export const LET_INSERT_BEFORE = "let:insert-before";
export const LET_INSERT_AFTER = "let:insert-after";
export const LET_MOVE_EARLIER = "let:move-earlier";
export const LET_MOVE_LATER = "let:move-later";
export const LET_DELETE_BINDING = "let:delete";

type Binding = {
  readonly variable_id?: unknown;
  readonly variable_name?: unknown;
  readonly value?: unknown;
};

type LetInner = {
  readonly bindings?: ReadonlyArray<Binding>;
  readonly body?: unknown;
};

function letAt(
  expr: unknown,
  letPath: ReadonlyArray<PathStep>,
): LetInner | null {
  const node = getExpressionAtPath(expr, letPath);
  const inner = (node as { readonly Let?: LetInner } | null)?.Let;
  return inner !== undefined && Array.isArray(inner.bindings) ? inner : null;
}

/** `path` の最後が let の束縛の値 (`letBindingValue`) なら, その束縛の番号と束縛の数 */
function bindingAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): { readonly index: number; readonly length: number } | null {
  const last = path[path.length - 1];
  if (typeof last !== "object" || last.kind !== "letBindingValue") {
    return null;
  }
  const bindings = letAt(expr, path.slice(0, -1))?.bindings;
  return bindings === undefined || last.index >= bindings.length
    ? null
    : { index: last.index, length: bindings.length };
}

const action = (
  value: string,
  name: string,
  detail?: string,
): SelectorOption => ({
  value,
  name,
  detail,
  category: "Let",
  returnType: "any",
});

/**
 * let の束縛の操作の選択肢. let そのものなら末尾に束縛を足す,
 * 束縛の値なら前後に束縛を足す・前後へ動かす・消す
 */
export function letBindingSelectorOptions(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  const binding = bindingAt(expr, path);
  return [
    ...(letAt(expr, path) !== null
      ? [action(LET_APPEND_BINDING, "add-binding", "x = □")]
      : []),
    ...(binding === null
      ? []
      : [
          action(LET_INSERT_BEFORE, "insert-binding-before"),
          action(LET_INSERT_AFTER, "insert-binding-after"),
          ...(binding.index > 0
            ? [action(LET_MOVE_EARLIER, "move-binding-earlier", "↑")]
            : []),
          ...(binding.index < binding.length - 1
            ? [action(LET_MOVE_LATER, "move-binding-later", "↓")]
            : []),
          action(
            LET_DELETE_BINDING,
            "delete-binding",
            binding.length === 1 ? "→ body" : undefined,
          ),
        ]),
  ];
}

export function isLetAction(value: string): boolean {
  return value.startsWith("let:");
}

/** 式全体の変数名と重ならない新しい変数名 (`x`, `x1`, `x2`, ...) */
function newVariableName(expr: unknown): string {
  const used = new Set<string>();
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "variable_name" || key === "parameter_name") {
        used.add(String(child));
      } else {
        walk(child);
      }
    }
  }
  walk(expr);
  for (let i = 0; ; i += 1) {
    const name = i === 0 ? "x" : `x${i}`;
    if (!used.has(name)) {
      return name;
    }
  }
}

function updateBindingsAt(
  expr: unknown,
  letPath: ReadonlyArray<PathStep>,
  updater: (bindings: ReadonlyArray<Binding>) => ReadonlyArray<Binding>,
): unknown {
  return updateExpressionAtPath(expr, letPath, (node) => {
    const inner = (node as { readonly Let?: LetInner } | null)?.Let;
    if (inner === undefined) {
      return node;
    }
    return { Let: { ...inner, bindings: updater(inner.bindings ?? []) } };
  });
}

/**
 * let の束縛の操作 ({@link letBindingSelectorOptions}) を適用する.
 * 新しい束縛は値を未入力にし, 式全体で使われていない変数 ID と名前にする.
 * 操作した後に選ぶ位置 (足した束縛の値・動かした束縛の値・消した束縛の隣) も返す. 適用できなければ `null`.
 * 束縛を消したり前へ動かしたりして変数が見えなくなった式は, 型チェッカーが型エラーにする
 */
export function applyLetAction(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): {
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep>;
} | null {
  const valuePath = (letPath: ReadonlyArray<PathStep>, index: number) => [
    ...letPath,
    { kind: "letBindingValue" as const, index },
  ];
  const newBinding = (): Binding => ({
    variable_id: nextVariableId(expr),
    variable_name: newVariableName(expr),
    value: { Hole: {} },
  });
  if (value === LET_APPEND_BINDING) {
    const inner = letAt(expr, path);
    if (inner === null) {
      return null;
    }
    return {
      expression: updateBindingsAt(expr, path, (bindings) => [
        ...bindings,
        newBinding(),
      ]),
      selectedPath: valuePath(path, inner.bindings?.length ?? 0),
    };
  }
  const binding = bindingAt(expr, path);
  if (binding === null) {
    return null;
  }
  const letPath = path.slice(0, -1);
  const { index, length } = binding;
  switch (value) {
    case LET_INSERT_BEFORE:
    case LET_INSERT_AFTER: {
      const at = value === LET_INSERT_BEFORE ? index : index + 1;
      return {
        expression: updateBindingsAt(expr, letPath, (bindings) => [
          ...bindings.slice(0, at),
          newBinding(),
          ...bindings.slice(at),
        ]),
        selectedPath: valuePath(letPath, at),
      };
    }
    case LET_MOVE_EARLIER:
    case LET_MOVE_LATER: {
      const to = value === LET_MOVE_EARLIER ? index - 1 : index + 1;
      if (to < 0 || to >= length) {
        return null;
      }
      return {
        expression: updateBindingsAt(expr, letPath, (bindings) =>
          bindings.map((current, i) =>
            i === index
              ? (bindings[to] ?? current)
              : i === to
                ? (bindings[index] ?? current)
                : current,
          ),
        ),
        selectedPath: valuePath(letPath, to),
      };
    }
    case LET_DELETE_BINDING:
      // 最後の束縛を消したら let をやめて本体だけにする
      if (length === 1) {
        return {
          expression: updateExpressionAtPath(
            expr,
            letPath,
            (node) =>
              (node as { readonly Let?: LetInner } | null)?.Let?.body ?? node,
          ),
          selectedPath: letPath,
        };
      }
      return {
        expression: updateBindingsAt(expr, letPath, (bindings) =>
          bindings.filter((_, i) => i !== index),
        ),
        selectedPath: valuePath(letPath, Math.min(index, length - 2)),
      };
    default:
      return null;
  }
}

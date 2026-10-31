/**
 * 関数 (値の `function` と型の `type_function`) の引数の追加・削除と, 型の引数名の変更 (docs/ui.md「式エディタの操作」).
 * 関数そのものを選んだときの置換メニューに操作の選択肢を出す.
 * パーツの型と式の根の関数の引数を揃えるのと, 呼び出し側の引数を合わせるのは pages/part/[id].tsx (`editPart`) と
 * part_type.ts / rename_arguments.ts でする
 */
import type { SelectorOption } from "./selector_options.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import type { PathStep } from "./types.ts";
import { field, variant, variantOf } from "../definy_value.ts";
import { nextVariableId } from "./selection.ts";

/** 置換メニューの選択肢の value. 削除は後ろに引数の番号が付く */
export const PARAMETER_APPEND = "parameter:append";
export const PARAMETER_DELETE_PREFIX = "parameter:delete:";

/** 関数の引数名. 値の関数は `parameter_name`, 型の関数は `name` */
function parameterNamesOf(node: unknown): {
  readonly tag: "function" | "type_function";
  readonly names: ReadonlyArray<string>;
} | null {
  const tagged = variantOf(node);
  if (
    tagged === undefined ||
    (tagged.tag !== "function" && tagged.tag !== "type_function")
  ) {
    return null;
  }
  const parameters = field(tagged.payload, "parameters");
  const nameKey = tagged.tag === "function" ? "parameter_name" : "name";
  return {
    tag: tagged.tag,
    names: Array.isArray(parameters)
      ? parameters.map((p) => String(field(p, nameKey) ?? ""))
      : [],
  };
}

/** 他の引数と重ならない新しい引数名 (`x`, `y`, `z`, `x1`, ...) */
export function newParameterName(names: ReadonlyArray<string>): string {
  const used = new Set(names);
  for (const candidate of ["x", "y", "z"]) {
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  let n = 1;
  while (used.has(`x${n}`)) {
    n += 1;
  }
  return `x${n}`;
}

const action = (
  value: string,
  name: string,
  detail?: string,
): SelectorOption => ({
  value,
  name,
  detail,
  category: "Parameter",
  returnType: "any",
});

/** 関数 (値・型) を選んだときの引数の操作の選択肢: 末尾に引数を足す, 各引数を消す */
export function functionParameterSelectorOptions(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  const fn = parameterNamesOf(getExpressionAtPath(expr, path));
  if (fn === null) {
    return [];
  }
  return [
    action(
      PARAMETER_APPEND,
      "add-parameter",
      `(..., ${newParameterName(fn.names)})`,
    ),
    ...fn.names.map((name, index) =>
      action(`${PARAMETER_DELETE_PREFIX}${index}`, `delete-parameter ${name}`),
    ),
  ];
}

export function isParameterAction(value: string): boolean {
  return value.startsWith("parameter:");
}

/**
 * 引数の操作 ({@link functionParameterSelectorOptions}) を適用する. 足した引数の名前・関数を選ぶ.
 * 適用できなければ `null`
 */
export function applyParameterAction(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): {
  readonly expression: unknown;
  readonly selectedPath: ReadonlyArray<PathStep>;
} | null {
  const target = getExpressionAtPath(expr, path);
  const fn = parameterNamesOf(target);
  const tagged = variantOf(target);
  if (fn === null || tagged === undefined) {
    return null;
  }
  const parameters: ReadonlyArray<unknown> = (() => {
    const list = field(tagged.payload, "parameters");
    return Array.isArray(list) ? list : [];
  })();
  const withParameters = (next: ReadonlyArray<unknown>) =>
    updateExpressionAtPath(expr, path, () =>
      variant(fn.tag, { ...(tagged.payload as object), parameters: next }),
    );
  if (value === PARAMETER_APPEND) {
    const name = newParameterName(fn.names);
    const added =
      fn.tag === "function"
        ? { parameter_id: nextVariableId(expr), parameter_name: name }
        : { name, type: variant("type_number") };
    const index = parameters.length;
    return {
      expression: withParameters([...parameters, added]),
      selectedPath: [
        ...path,
        fn.tag === "function"
          ? { kind: "functionParameter", index }
          : { kind: "typeFunctionParameterName", index },
      ],
    };
  }
  if (value.startsWith(PARAMETER_DELETE_PREFIX)) {
    const index = Number(value.slice(PARAMETER_DELETE_PREFIX.length));
    if (!Number.isInteger(index) || index < 0 || index >= parameters.length) {
      return null;
    }
    return {
      expression: withParameters(parameters.filter((_, i) => i !== index)),
      selectedPath: path,
    };
  }
  return null;
}

/** `path` の最後が型の関数の引数名 ({@link PathStep} の `typeFunctionParameterName`) なら, その番号 */
export function typeFunctionParameterNameIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === "typeFunctionParameterName"
    ? last.index
    : null;
}

/** 型の関数の引数名 (`path` は `typeFunctionParameterName` で終わる) を変える */
export function renameTypeFunctionParameter(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const index = typeFunctionParameterNameIndex(path);
  if (index === null) {
    return expr;
  }
  return updateExpressionAtPath(expr, path.slice(0, -1), (target) => {
    const tagged = variantOf(target);
    if (tagged?.tag !== "type_function") {
      return target;
    }
    const parameters = field(tagged.payload, "parameters");
    return variant("type_function", {
      ...(tagged.payload as object),
      parameters: (Array.isArray(parameters) ? parameters : []).map((p, i) =>
        i === index ? { ...(p as object), name } : p,
      ),
    });
  });
}

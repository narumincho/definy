/**
 * ローカル変数 (関数の引数, let の束縛, match のアームの束縛) の名前の変更と, 定義への移動.
 * 変数は ID で参照しているので, 名前を変えても参照する側の式は変えなくてよい
 */
import {
  functionParameterIndex,
  getExpressionAtPath,
  renameFunctionParameter,
  updateExpressionAtPath,
} from "./path.ts";
import {
  matchArmVariableIndex,
  renameMatchArmVariable,
} from "./match_pattern.ts";
import type { SelectorOption } from "./selector_options.ts";
import type { PathStep } from "./types.ts";

/** `path` の最後が let の束縛の変数名 ({@link PathStep} の `letBindingName`) なら, その束縛の番号 */
export function letBindingNameIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === "letBindingName"
    ? last.index
    : null;
}

/**
 * `path` が変数の名前 (関数の引数名・let の変数名・match で束縛する変数の名前) か.
 * 名前は式ではないので, 選ぶと置換メニューではなく名前の入力欄になる
 */
export function isVariableNamePath(path: ReadonlyArray<PathStep>): boolean {
  return (
    functionParameterIndex(path) !== null ||
    letBindingNameIndex(path) !== null ||
    matchArmVariableIndex(path) !== null
  );
}

/** let の束縛 (`path` は `letBindingName` で終わる) の変数名を変える */
export function renameLetBinding(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const index = letBindingNameIndex(path);
  if (index === null) {
    return expr;
  }
  return updateExpressionAtPath(expr, path.slice(0, -1), (target) => {
    const letNode = (target as { readonly Let?: unknown } | null)?.Let as
      | {
          readonly bindings?: ReadonlyArray<Readonly<Record<string, unknown>>>;
        }
      | undefined;
    if (letNode === undefined || !Array.isArray(letNode.bindings)) {
      return target;
    }
    return {
      Let: {
        ...letNode,
        bindings: letNode.bindings.map((binding, i) =>
          i === index ? { ...binding, variable_name: name } : binding,
        ),
      },
    };
  });
}

/** 変数の名前 (`path`, {@link isVariableNamePath}) を変える. 名前でなければ式をそのまま返す */
export function renameVariableAt(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  if (functionParameterIndex(path) !== null) {
    return renameFunctionParameter(expr, path, name);
  }
  if (letBindingNameIndex(path) !== null) {
    return renameLetBinding(expr, path, name);
  }
  if (matchArmVariableIndex(path) !== null) {
    return renameMatchArmVariable(expr, path, name);
  }
  return expr;
}

function variableIdOf(value: unknown): number | null {
  const raw = (value as { readonly Variable?: unknown } | null)?.Variable;
  if (raw === undefined) {
    return null;
  }
  const id =
    typeof raw === "number"
      ? raw
      : Number((raw as { readonly variable_id?: unknown } | null)?.variable_id);
  return Number.isInteger(id) ? id : null;
}

/**
 * その位置の式が参照する変数の ID. 変数そのもののほか, 関数型の変数の呼び出し (`f(x: 1)`) も変数を参照しているとみなす
 */
export function referencedVariableId(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): number | null {
  const target = getExpressionAtPath(expr, path);
  const callee = (
    target as { readonly Call?: { readonly function?: unknown } } | null
  )?.Call?.function;
  return variableIdOf(callee !== undefined ? callee : target);
}

/**
 * `path` の位置へ降りるまでに定義される変数ごとに, 定義 (変数名) のパスを集める.
 * 内側の定義が外側の同じ ID の定義を隠す
 */
function definitionsInScope(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyMap<number, ReadonlyArray<PathStep>> {
  const definitions = new Map<number, ReadonlyArray<PathStep>>();
  for (const [depth, step] of path.entries()) {
    if (
      typeof step !== "object" &&
      step !== "letBody" &&
      step !== "functionBody"
    ) {
      continue;
    }
    const prefix = path.slice(0, depth);
    const node = getExpressionAtPath(expr, prefix) as Record<
      string,
      unknown
    > | null;
    if (node === null || typeof node !== "object") {
      continue;
    }
    if ("Let" in node) {
      const bindings = (node.Let as { readonly bindings?: unknown } | null)
        ?.bindings;
      if (!Array.isArray(bindings)) {
        continue;
      }
      // 束縛の値からは, それより前の束縛を参照できる
      const count =
        step === "letBody"
          ? bindings.length
          : typeof step === "object" && step.kind === "letBindingValue"
            ? step.index
            : 0;
      for (const [index, binding] of bindings.slice(0, count).entries()) {
        const id = Number(
          (binding as { readonly variable_id?: unknown } | null)?.variable_id,
        );
        if (Number.isInteger(id)) {
          definitions.set(id, [...prefix, { kind: "letBindingName", index }]);
        }
      }
    } else if ("Function" in node && step === "functionBody") {
      const parameters = (
        node.Function as { readonly parameters?: unknown } | null
      )?.parameters;
      for (const [index, parameter] of (Array.isArray(parameters)
        ? parameters
        : []
      ).entries()) {
        const p = parameter as {
          readonly parameter_id?: unknown;
          readonly variable_id?: unknown;
        } | null;
        const id = Number(p?.parameter_id ?? p?.variable_id);
        if (Number.isInteger(id)) {
          definitions.set(id, [
            ...prefix,
            { kind: "functionParameter", index },
          ]);
        }
      }
    } else if (
      "Match" in node &&
      typeof step === "object" &&
      step.kind === "matchArmBody"
    ) {
      const arm = (
        node.Match as { readonly arms?: ReadonlyArray<unknown> } | null
      )?.arms?.[step.index] as { readonly variable_id?: unknown } | undefined;
      if (typeof arm?.variable_id === "number") {
        definitions.set(arm.variable_id, [
          ...prefix,
          { kind: "matchArmVariable", index: step.index },
        ]);
      }
    }
  }
  return definitions;
}

/**
 * その位置の式が参照するローカル変数の定義 (関数の引数名・let の変数名・match で束縛する変数の名前) のパス.
 * 変数を参照していない, または定義が式の中に無ければ `null`
 */
export function findVariableDefinitionPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<PathStep> | null {
  const id = referencedVariableId(expr, path);
  if (id === null) {
    return null;
  }
  return definitionsInScope(expr, path).get(id) ?? null;
}

/** 置換メニューの「定義へ移動」の選択肢の value */
export const GO_TO_DEFINITION = "action:go-to-definition";

/** 選んだ式が定義の分かる変数を参照していれば, 置換メニューに出す「定義へ移動」の選択肢 */
export function goToDefinitionOption(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  return findVariableDefinitionPath(expr, path) === null
    ? []
    : [
        {
          value: GO_TO_DEFINITION,
          name: "go-to-definition",
          detail: "F12",
          category: "Local",
          returnType: "any",
        },
      ];
}

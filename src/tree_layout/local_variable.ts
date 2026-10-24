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
import type { PathStep } from "./types.ts";
import { field, variantPayload } from "../definy_value.ts";
import {
  armBindsVariable,
  callOf,
  letChain,
  letChainOf,
  matchOf,
  variableIdOf,
} from "./expression.ts";

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
    const chain = letChainOf(target);
    if (chain === undefined) {
      return target;
    }
    return letChain(
      chain.bindings.map((binding, i) =>
        i === index ? { ...binding, variable_name: name } : binding,
      ),
      chain.body,
    );
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

/**
 * その位置の式が参照する変数の ID. 変数そのもののほか, 関数型の変数の呼び出し (`f(x: 1)`) も変数を参照しているとみなす
 */
export function referencedVariableId(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): number | null {
  const target = getExpressionAtPath(expr, path);
  const call = callOf(target);
  return variableIdOf(call !== undefined ? call.callee : target);
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
    const node = getExpressionAtPath(expr, prefix);
    const chain = letChainOf(node);
    const fn = variantPayload(node, "function");
    const match = matchOf(node);
    if (chain !== undefined) {
      // 束縛の値からは, それより前の束縛を参照できる
      const count =
        step === "letBody"
          ? chain.bindings.length
          : typeof step === "object" && step.kind === "letBindingValue"
            ? step.index
            : 0;
      for (const [index, binding] of chain.bindings.slice(0, count).entries()) {
        if (Number.isInteger(binding.variable_id)) {
          definitions.set(binding.variable_id, [
            ...prefix,
            { kind: "letBindingName", index },
          ]);
        }
      }
    } else if (fn !== undefined && step === "functionBody") {
      const parameters = field(fn, "parameters");
      for (const [index, parameter] of (Array.isArray(parameters)
        ? parameters
        : []
      ).entries()) {
        const id = Number(field(parameter, "parameter_id"));
        if (Number.isInteger(id)) {
          definitions.set(id, [
            ...prefix,
            { kind: "functionParameter", index },
          ]);
        }
      }
    } else if (
      match !== undefined &&
      typeof step === "object" &&
      step.kind === "matchArmBody"
    ) {
      const arm = match.arms[step.index];
      if (arm !== undefined && armBindsVariable(arm)) {
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

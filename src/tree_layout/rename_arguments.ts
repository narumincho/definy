/**
 * 関数のパーツの引数名を変えたときに, そのパーツを呼び出している式の引数名も合わせて変える.
 * 呼び出しは引数をパーツの型の引数名で渡すので (docs/call-syntax.md), 直さないと呼び出し側が型エラーになる
 */
import { variant, variantPayload } from "../definy_value.ts";
import type { PartChange, PartSnapshot, WorkingChanges } from "../types.ts";
import { callExpression, callOf, partReferenceIdOf } from "./expression.ts";

/**
 * 関数のパーツの型が `before` から `after` に変わったときの引数名の変更 (変更前の名前 → 変更後の名前).
 * 引数の数が同じで, 同じ位置の名前が変わったものだけを名前の変更とみなす (引数の追加・削除・並び替えは扱わない)
 */
export function parameterRenames(
  before: unknown,
  after: unknown,
): ReadonlyMap<string, string> {
  const beforeNames = parameterNames(before);
  const afterNames = parameterNames(after);
  const renames = new Map<string, string>();
  if (
    beforeNames === undefined ||
    afterNames === undefined ||
    beforeNames.length !== afterNames.length
  ) {
    return renames;
  }
  beforeNames.forEach((name, index) => {
    const next = afterNames[index];
    if (next !== undefined && next !== name) {
      renames.set(name, next);
    }
  });
  return renames;
}

function parameterNames(type: unknown): ReadonlyArray<string> | undefined {
  const parameters = (
    variantPayload(type, "type_function") as
      | { readonly parameters?: ReadonlyArray<{ readonly name?: unknown }> }
      | undefined
  )?.parameters;
  return parameters?.map((parameter) => String(parameter.name));
}

/**
 * 式の中の `partIdHash` のパーツの呼び出しの引数名を `renames` で変える.
 * 変える呼び出しが無ければ同じ値を返す
 */
export function renameCallArguments(
  expression: unknown,
  partIdHash: string,
  renames: ReadonlyMap<string, string>,
): unknown {
  if (renames.size === 0) {
    return expression;
  }
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      let changed = false;
      const items = node.map((item) => {
        const next = visit(item);
        changed ||= next !== item;
        return next;
      });
      return changed ? items : node;
    }
    if (!node || typeof node !== "object" || node instanceof Uint8Array) {
      return node;
    }
    const call = callOf(node);
    if (call !== undefined) {
      const isTarget = partReferenceIdOf(call.callee) === partIdHash;
      const callee = visit(call.callee);
      let changed = callee !== call.callee;
      const args = call.arguments.map((argument) => {
        const value = visit(argument.value);
        const name = isTarget
          ? (renames.get(argument.name) ?? argument.name)
          : argument.name;
        if (value === argument.value && name === argument.name) {
          return argument;
        }
        changed = true;
        return { ...argument, name, value };
      });
      return changed ? callExpression(callee, args) : node;
    }
    let changed = false;
    const entries = Object.entries(node).map(([key, child]) => {
      const next = visit(child);
      changed ||= next !== child;
      return [key, next] as const;
    });
    return changed ? Object.fromEntries(entries) : node;
  };
  return visit(expression);
}

/**
 * `partIdHash` のパーツを呼び出している他のパーツ (`exceptPartId` 以外) の, 引数名を変えた作業中の変更.
 * 作業中の変更があるパーツはその式を変える
 */
export function renameCallersOf(
  parts: ReadonlyArray<PartSnapshot>,
  workingChanges: WorkingChanges,
  partIdHash: string,
  renames: ReadonlyMap<string, string>,
  exceptPartId: string,
): ReadonlyArray<PartChange> {
  return parts.flatMap((part) => {
    if (part.partId === exceptPartId) {
      return [];
    }
    const change = workingChanges.parts.get(part.partId);
    const expression = change?.expression ?? part.expression;
    const renamed = renameCallArguments(expression, partIdHash, renames);
    if (renamed === expression) {
      return [];
    }
    return [
      {
        ...(change ?? {
          moduleDefinitionEventHash: part.moduleId,
          partDefinitionEventHash: part.partId,
          name: part.name,
          description: part.description,
          partType: part.partType,
        }),
        expression: renamed,
      },
    ];
  });
}

/**
 * 式の根の関数の引数名を `renames` で変える (型の行で引数名を変えたとき, 式の引数名も揃える).
 * 根が関数でない・変える名前が無ければ同じ値を返す
 */
export function renameRootParameters(
  expression: unknown,
  renames: ReadonlyMap<string, string>,
): unknown {
  const fn = variantPayload(expression, "function") as
    | {
        readonly parameters?: ReadonlyArray<{
          readonly parameter_name?: unknown;
        }>;
      }
    | undefined;
  if (
    fn?.parameters === undefined ||
    !fn.parameters.some((parameter) =>
      renames.has(String(parameter.parameter_name)),
    )
  ) {
    return expression;
  }
  return variant("function", {
    ...fn,
    parameters: fn.parameters.map((parameter) => {
      const name = renames.get(String(parameter.parameter_name));
      return name === undefined
        ? parameter
        : { ...parameter, parameter_name: name };
    }),
  });
}

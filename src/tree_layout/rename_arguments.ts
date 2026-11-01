/**
 * 関数のパーツの引数名を変えたときに, そのパーツを呼び出している式の引数名も合わせて変える.
 * 呼び出しは引数をパーツの型の引数名で渡すので (docs/call-syntax.md), 直さないと呼び出し側が型エラーになる
 */
import { variant, variantPayload } from "../definy_value.ts";
import type { PartChange, PartSnapshot, WorkingChanges } from "../types.ts";
import {
  callExpression,
  callOf,
  hole,
  partReferenceIdOf,
} from "./expression.ts";
import { nextVariableId } from "./selection.ts";

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
  return changedCallers(parts, workingChanges, exceptPartId, (expression) =>
    renameCallArguments(expression, partIdHash, renames),
  );
}

/**
 * 他のパーツ (`exceptPartId` と削除するパーツ以外. コミットしていない新しいパーツも含む) の式を `update` で変え,
 * 変わったものを作業中の変更にする. 作業中の変更があるパーツはその式を変える
 */
function changedCallers(
  parts: ReadonlyArray<PartSnapshot>,
  workingChanges: WorkingChanges,
  exceptPartId: string,
  update: (expression: unknown) => unknown,
): ReadonlyArray<PartChange> {
  const result: Array<PartChange> = [];
  const seen = new Set<string>([exceptPartId]);
  const visit = (key: string, change: PartChange): void => {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    if (change.deleted === true) {
      return;
    }
    const updated = update(change.expression);
    if (updated !== change.expression) {
      result.push({ ...change, expression: updated });
    }
  };
  for (const part of parts) {
    visit(
      part.partId,
      workingChanges.parts.get(part.partId) ?? {
        moduleDefinitionEventHash: part.moduleId,
        partDefinitionEventHash: part.partId,
        name: part.name,
        description: part.description,
        partType: part.partType,
        expression: part.expression,
      },
    );
  }
  for (const [key, change] of workingChanges.parts) {
    visit(key, { ...change, partDefinitionEventHash: key });
  }
  return result;
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

/** 関数のパーツの型の引数名 (宣言の順). 関数の型でなければ `undefined` */
export function partTypeParameterNames(
  partType: unknown,
): ReadonlyArray<string> | undefined {
  return parameterNames(partType);
}

/**
 * 式の中の `partIdHash` のパーツの呼び出しの引数を, 引数名 `names` に合わせる (引数を足した・消したとき).
 * 無い引数は未入力で足し, `names` に無い引数は消す. 変える呼び出しが無ければ同じ値を返す
 */
export function syncCallArguments(
  expression: unknown,
  partIdHash: string,
  names: ReadonlyArray<string>,
): unknown {
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
      let args = call.arguments.map((argument) => {
        const value = visit(argument.value);
        if (value === argument.value) {
          return argument;
        }
        changed = true;
        return { ...argument, value };
      });
      if (isTarget) {
        const kept = args.filter((argument) => names.includes(argument.name));
        const missing = names.filter(
          (name) => !kept.some((argument) => argument.name === name),
        );
        if (kept.length !== args.length || missing.length > 0) {
          changed = true;
          args = [...kept, ...missing.map((name) => ({ name, value: hole() }))];
        }
      }
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
 * `partIdHash` のパーツを呼び出している他のパーツ (`exceptPartId` 以外) の, 呼び出しの引数を `names` に合わせた作業中の変更
 */
export function syncCallersOf(
  parts: ReadonlyArray<PartSnapshot>,
  workingChanges: WorkingChanges,
  partIdHash: string,
  names: ReadonlyArray<string>,
  exceptPartId: string,
): ReadonlyArray<PartChange> {
  return changedCallers(parts, workingChanges, exceptPartId, (expression) =>
    syncCallArguments(expression, partIdHash, names),
  );
}

type RootParameter = {
  readonly parameter_id: number;
  readonly parameter_name: string;
};

/**
 * パーツの型の引数が `beforeType` から `afterType` に足された・消されたら,
 * 式の根の関数の引数も同じ名前の並びにする. 同じ名前の引数は変数 ID をそのまま使い, 新しい引数には新しい ID を振る.
 * 引数の数が同じとき (名前の変更) は {@link renameRootParameters} で揃えるので何もしない.
 * 根が関数でない・型が関数でなければ同じ値を返す
 */
export function syncRootParameters(
  expression: unknown,
  beforeType: unknown,
  afterType: unknown,
): unknown {
  const beforeNames = parameterNames(beforeType);
  const afterNames = parameterNames(afterType);
  const fn = variantPayload(expression, "function") as
    | {
        readonly parameters?: ReadonlyArray<RootParameter>;
        readonly body?: unknown;
      }
    | undefined;
  if (
    beforeNames === undefined ||
    afterNames === undefined ||
    fn?.parameters === undefined
  ) {
    return expression;
  }
  if (beforeNames.length === afterNames.length) {
    return expression;
  }
  let nextId = nextVariableId(expression);
  const parameters = afterNames.map(
    (name): RootParameter =>
      fn.parameters?.find((p) => String(p.parameter_name) === name) ?? {
        parameter_id: nextId++,
        parameter_name: name,
      },
  );
  return variant("function", { ...fn, parameters });
}

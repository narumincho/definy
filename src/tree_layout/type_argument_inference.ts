/**
 * 型引数の推論 (エディタ側. docs/type-arguments.md「エディタ」).
 *
 * 呼び出しの型引数 (呼び出すパーツの型の引数で, 型が `type` のもの) が未入力のとき, ほかの引数の推論された型と
 * パーツの型の引数の型を照らし合わせて型引数を求める. 求めた型は未入力の枠に薄く出し, 置換メニューの選択肢の先頭に置く
 * (選ぶと確定する).
 *
 * ```text
 * core.list-map: (T: type, U: type, f: (item: T) -> U, xs: List<T>) -> List<U>
 * core.list-map(T: □, U: □, f: ..., xs: [1, 2])   // xs の型 List<number> と List<T> から T = number
 * ```
 */
import { field, variantOf, variantPayload } from "../definy_value.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import {
  callOf,
  isHole,
  partReferenceIdOf,
  variableExpression,
} from "./expression.ts";
import {
  expressionToTypeAst,
  typeAstToExpression,
} from "../type_ast_expression.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { pathToString, type PathStep } from "./types.ts";
import type { SelectorOption } from "./selector_options.ts";

/** 未入力の型引数の枠と, 推論に使う引数 */
export type TypeArgumentHole = {
  /** 未入力の型引数の値のパス */
  readonly path: ReadonlyArray<PathStep>;
  /** 型引数の名前 (`T`) */
  readonly parameterName: string;
  /** 呼び出しのパス */
  readonly callPath: ReadonlyArray<PathStep>;
  /** 推論に使う引数: 値のパスと, パーツの型での引数の型 (`parameter(T)` を含む) */
  readonly sources: ReadonlyArray<{
    readonly path: ReadonlyArray<PathStep>;
    readonly parameterType: unknown;
  }>;
  /** 呼び出すパーツの型の戻り値の型が `parameter(T)` を含むなら, その型. 呼び出しの位置で期待する型と照らし合わせる */
  readonly returnType?: unknown;
};

type FunctionParameter = { readonly name: string; readonly type: unknown };

/**
 * パーツの型 (型の式) を型チェッカーの形 (`core.type-ast`) にする
 * (推論した型は型チェッカーが返す `core.type-ast` なので, 照らし合わせる側もそろえる)
 */
function toTypeAst(partType: unknown): unknown {
  return expressionToTypeAst(partType);
}

function functionParametersOf(
  partType: unknown,
): ReadonlyArray<FunctionParameter> | undefined {
  const parameters = field(variantPayload(partType, "function"), "parameters");
  return Array.isArray(parameters)
    ? parameters.map((parameter) => ({
        name: String(field(parameter, "name")),
        type: field(parameter, "type"),
      }))
    : undefined;
}

/** 型 (`core.type-ast`) の中に型引数の参照 `parameter(name)` があるか */
function mentionsParameter(type: unknown, name: string): boolean {
  const tagged = variantOf(type);
  if (tagged?.tag === "parameter") {
    return tagged.payload === name;
  }
  if (Array.isArray(type)) {
    return type.some((item) => mentionsParameter(item, name));
  }
  return (
    typeof type === "object" &&
    type !== null &&
    Object.values(type).some((value) => mentionsParameter(value, name))
  );
}

/**
 * 式の中の, 未入力の型引数の枠. `paths` は式の中の調べる位置 (ツリーの全ノードのパス),
 * `partTypeOf` はパーツ ID → パーツの型
 */
export function typeArgumentHoles(
  expression: unknown,
  paths: Iterable<ReadonlyArray<PathStep>>,
  partTypeOf: (partIdHash: string) => unknown,
): ReadonlyArray<TypeArgumentHole> {
  const holes: TypeArgumentHole[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const key = pathToString(path);
    if (seen.has(key)) continue;
    seen.add(key);
    const call = callOf(getExpressionAtPath(expression, path));
    const partId = call === undefined ? null : partReferenceIdOf(call.callee);
    if (call === undefined || partId === null) continue;
    const partType = toTypeAst(partTypeOf(partId));
    const parameters = functionParametersOf(partType);
    if (parameters === undefined) continue;
    const argumentPath = (index: number): ReadonlyArray<PathStep> => [
      ...path,
      { kind: "callArgument", index },
    ];
    call.arguments.forEach((argument, index) => {
      const name = String(argument.name);
      const parameter = parameters.find((p) => p.name === name);
      if (
        parameter === undefined ||
        variantOf(parameter.type)?.tag !== "type" ||
        !isHole(argument.value)
      ) {
        return;
      }
      const sources = call.arguments.flatMap((other, otherIndex) => {
        const otherParameter = parameters.find(
          (p) => p.name === String(other.name),
        );
        return otherIndex !== index &&
          otherParameter !== undefined &&
          !isHole(other.value) &&
          mentionsParameter(otherParameter.type, name)
          ? [
              {
                path: argumentPath(otherIndex),
                parameterType: otherParameter.type,
              },
            ]
          : [];
      });
      const returnType = field(
        variantPayload(partType, "function"),
        "return_type",
      );
      const usesReturnType = mentionsParameter(returnType, name);
      if (sources.length > 0 || usesReturnType) {
        holes.push({
          path: argumentPath(index),
          parameterName: name,
          callPath: path,
          sources,
          ...(usesReturnType ? { returnType } : {}),
        });
      }
    });
  }
  return holes;
}

/**
 * 引数の型 `parameterType` (`parameter(name)` を含む) と, 実引数の推論された型 `actual` を照らし合わせて
 * 型引数 `name` の型を求める. 形が合わない・`name` が出てこなければ `undefined`
 */
export function matchTypeParameter(
  parameterType: unknown,
  actual: unknown,
  name: string,
): DefinyValue | undefined {
  const tagged = variantOf(parameterType);
  if (tagged?.tag === "parameter") {
    return tagged.payload === name ? (actual as DefinyValue) : undefined;
  }
  if (Array.isArray(parameterType)) {
    if (!Array.isArray(actual) || actual.length !== parameterType.length) {
      return undefined;
    }
    for (const [i, item] of parameterType.entries()) {
      const found = matchTypeParameter(item, actual[i], name);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (
    typeof parameterType !== "object" ||
    parameterType === null ||
    typeof actual !== "object" ||
    actual === null ||
    Array.isArray(actual)
  ) {
    return undefined;
  }
  for (const [key, value] of Object.entries(parameterType)) {
    if (!Object.hasOwn(actual, key)) {
      return undefined;
    }
    const found = matchTypeParameter(
      value,
      (actual as Readonly<Record<string, unknown>>)[key],
      name,
    );
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * 引数の値の型を型チェッカーに聞くための式とパス. 呼び出しを引数の値に置き換える
 * (型引数が未入力のままの呼び出しは型チェッカーが先にエラーにするので, 呼び出しの外で聞く. 変数のスコープは同じ)
 */
export function argumentProbeTarget(
  expression: unknown,
  callPath: ReadonlyArray<PathStep>,
  argumentPath: ReadonlyArray<PathStep>,
): { readonly expression: unknown; readonly path: ReadonlyArray<PathStep> } {
  const value = getExpressionAtPath(expression, argumentPath);
  return {
    expression: updateExpressionAtPath(expression, callPath, () => value),
    path: callPath,
  };
}

/**
 * 未入力の型引数を推論する. まず引数の値の推論された型から, 分からなければ呼び出しの位置で期待する型と戻り値の型から求める.
 * `inferTypeAt` は式 `expression` のパス `path` の位置の式の推論された型, `expectedTypeAt` はその位置で期待する型
 * (分からなければ `null`). 結果は型引数の値のパス (`pathToString`) → 推論した型 (`core.type-ast`)
 */
export async function inferTypeArguments(
  expression: unknown,
  holes: ReadonlyArray<TypeArgumentHole>,
  inferTypeAt: (
    expression: unknown,
    path: ReadonlyArray<PathStep>,
  ) => Promise<unknown>,
  expectedTypeAt: (path: ReadonlyArray<PathStep>) => Promise<unknown>,
): Promise<ReadonlyMap<string, DefinyValue>> {
  const result = new Map<string, DefinyValue>();
  const expectedByCall = new Map<string, Promise<unknown>>();
  for (const hole of holes) {
    let found: DefinyValue | undefined;
    for (const source of hole.sources) {
      const target = argumentProbeTarget(
        expression,
        hole.callPath,
        source.path,
      );
      const actual = await inferTypeAt(target.expression, target.path);
      found =
        actual == null
          ? undefined
          : matchTypeParameter(
              source.parameterType,
              actual,
              hole.parameterName,
            );
      if (found !== undefined) break;
    }
    if (found === undefined && hole.returnType !== undefined) {
      const key = pathToString(hole.callPath);
      const expected = expectedByCall.get(key) ?? expectedTypeAt(hole.callPath);
      expectedByCall.set(key, expected);
      const type = await expected;
      found =
        type == null
          ? undefined
          : matchTypeParameter(hole.returnType, type, hole.parameterName);
    }
    if (found !== undefined) {
      result.set(pathToString(hole.path), found);
    }
  }
  return result;
}

/** 型 (`core.type-ast`) の短い表記. 推論した型引数を未入力の枠に薄く出すのに使う */
export function typeAstText(
  type: unknown,
  partNames: ReadonlyMap<string, string>,
): string {
  const tagged = variantOf(type);
  if (tagged === undefined) {
    return "?";
  }
  const { tag, payload } = tagged;
  switch (tag) {
    case "list":
      return `List<${typeAstText(field(payload, "item_type"), partNames)}>`;
    case "code":
      return `Code<${typeAstText(payload, partNames)}>`;
    case "parameter":
      return String(payload);
    case "reference":
      return partNames.get(String(field(payload, "part_hash"))) ?? "type";
    case "apply": {
      const args = field(payload, "arguments");
      const name = partNames.get(String(field(payload, "part_hash"))) ?? "?";
      return `${name}(${(Array.isArray(args) ? args : [])
        .map(
          (arg) =>
            `${String(field(arg, "name"))}: ${typeAstText(field(arg, "type"), partNames)}`,
        )
        .join(", ")})`;
    }
    case "record": {
      const fields = Array.isArray(payload) ? payload : [];
      return `{ ${fields
        .map(
          (item) =>
            `${String(field(item, "key"))}: ${typeAstText(field(item, "field_type"), partNames)}`,
        )
        .join(", ")} }`;
    }
    case "function": {
      const parameters = functionParametersOf(type) ?? [];
      return `(${parameters
        .map((p) => `${p.name}: ${typeAstText(p.type, partNames)}`)
        .join(
          ", ",
        )}) -> ${typeAstText(field(payload, "return_type"), partNames)}`;
    }
    case "union":
      return "union";
  }
  return tag;
}

/** 置換メニューの「推論した型引数で確定する」選択肢の値 */
export const INFERRED_TYPE_ARGUMENT = "action:inferred-type-argument";

/** 推論した型引数で確定する選択肢. 置換メニューの先頭に置く */
export function inferredTypeArgumentOption(text: string): SelectorOption {
  return {
    value: INFERRED_TYPE_ARGUMENT,
    name: text,
    detail: "inferred",
    category: "Inferred",
    returnType: "any",
  };
}

/**
 * 推論した型 (`core.type-ast`) を型引数の位置に書く式にする. 型の式にし, 型引数の参照 `type_parameter("T")` は
 * その位置から見える同じ名前の変数 (関数の型引数の引数) にする (値の式の中の型引数は変数なので)
 */
export function inferredTypeExpression(
  type: unknown,
  scopeVariables: ReadonlyMap<number, string> | undefined,
): unknown {
  const variableIdByName = new Map<string, number>();
  for (const [id, name] of scopeVariables ?? []) {
    // 内側 (後から足した) の変数を優先する
    variableIdByName.set(name, id);
  }
  const replace = (expression: unknown): unknown => {
    const tagged = variantOf(expression);
    if (tagged?.tag === "type_parameter") {
      const id = variableIdByName.get(String(tagged.payload));
      return id === undefined ? expression : variableExpression(id);
    }
    if (Array.isArray(expression)) {
      return expression.map(replace);
    }
    if (typeof expression === "object" && expression !== null) {
      return Object.fromEntries(
        Object.entries(expression).map(([key, value]) => [key, replace(value)]),
      );
    }
    return expression;
  };
  return replace(typeAstToExpression(type));
}

/**
 * 型引数の推論 (エディタ側. docs/type-arguments.md「エディタ」).
 *
 * 呼び出しの型引数 (呼び出すパーツの型の引数で, 型が `type` のもの) が未入力の枠を見つける. 推論は型チェッカー
 * (`core.type-infer-type-argument`) がし, エディタは枠を probe にして推論した型を聞く (`findInferredTypeArgument`).
 * 求めた型は未入力の枠に薄く出し, 置換メニューの選択肢の先頭に置く (選ぶと確定する).
 *
 * ```text
 * core.list-map: (T: type, U: type, f: (item: T) -> U, xs: List<T>) -> List<U>
 * core.list-map(T: □, U: □, f: ..., xs: [1, 2])   // xs の型 List<number> と List<T> から T = number
 * ```
 */
import { field, variantOf, variantPayload } from "../definy_value.ts";
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
import { getExpressionAtPath } from "./path.ts";
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

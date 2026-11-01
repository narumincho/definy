/**
 * 未確定 (未入力 `hole` のまま) の型引数 (docs/type-arguments.md「未確定の型引数」).
 *
 * 型チェッカーは呼び出しの型引数が未入力なら推論する (`core.type-infer-type-argument`). その位置を
 * `{"#hole": {"probe": true}}` にして検査すると, 型チェッカーは `hole_expected_type` のエラーの
 * `inferred_type_argument` に推論した型を入れて返す. ここではその問い合わせで,
 *
 * - 式の未入力が全て推論できる型引数か (コミットの検査で, 型引数以外の未入力は受け付けない)
 * - 実行・コンパイルの前に推論した型で埋めた式
 *
 * を求める. 型チェッカーの呼び方 (`probe`) は呼び出し側が渡す
 */
import { typeAstToExpression } from "./type_ast_expression.ts";

/** 式の JSON の中の位置 (オブジェクトのキーか配列の添字の並び) */
type JsonPath = ReadonlyArray<string | number>;

/** 式 (`core.expression` の値) の中の未入力 (`{"#hole": ...}`) の位置を, 出てくる順に集める */
function holePaths(expression: unknown): ReadonlyArray<JsonPath> {
  const paths: JsonPath[] = [];
  const walk = (value: unknown, path: JsonPath): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, index]));
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }
    if (Object.hasOwn(value, "#hole")) {
      paths.push(path);
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      walk(item, [...path, key]);
    }
  };
  walk(expression, []);
  return paths;
}

/** 式の `path` の位置を `replacement` に置き換えた式 */
function replaceAtJsonPath(
  expression: unknown,
  path: JsonPath,
  replacement: unknown,
): unknown {
  const [head, ...rest] = path;
  if (head === undefined) {
    return replacement;
  }
  if (Array.isArray(expression) && typeof head === "number") {
    return expression.map((item, index) =>
      index === head ? replaceAtJsonPath(item, rest, replacement) : item,
    );
  }
  if (
    expression !== null &&
    typeof expression === "object" &&
    typeof head === "string"
  ) {
    return {
      ...expression,
      [head]: replaceAtJsonPath(
        (expression as Readonly<Record<string, unknown>>)[head],
        rest,
        replacement,
      ),
    };
  }
  return expression;
}

/** 期待する型を聞く未入力 */
const PROBE = { "#hole": { probe: true } };

/** 未入力の位置で型チェッカーに聞いた結果 */
export type HoleProbeResult =
  /** 型引数の位置で, 推論した型 (`core.type-ast`) */
  | { readonly kind: "type_argument"; readonly type: unknown }
  /** 型引数でないか, 推論できない */
  | { readonly kind: "other" };

/**
 * 式の各未入力の位置で推論した型引数. 1 つでも型引数でない (推論できない) 未入力があれば `null`.
 * `probe` は式 (未入力の 1 つを probe にしたもの) を型チェッカーで検査して, その位置の結果を返す
 */
export function inferHoleTypeArguments(
  expression: unknown,
  probe: (probed: unknown) => HoleProbeResult,
): ReadonlyArray<{ readonly path: JsonPath; readonly type: unknown }> | null {
  const result: { readonly path: JsonPath; readonly type: unknown }[] = [];
  for (const path of holePaths(expression)) {
    const outcome = probe(replaceAtJsonPath(expression, path, PROBE));
    if (outcome.kind !== "type_argument") {
      return null;
    }
    result.push({ path, type: outcome.type });
  }
  return result;
}

/**
 * 式の `path` の位置から見える関数の引数の名前 → 変数 ID (内側の引数を優先).
 * 型引数は関数の引数なので, 推論した型の中の型引数の参照 (`type_parameter("T")`) をその変数にするのに使う
 */
function functionParametersInScope(
  expression: unknown,
  path: JsonPath,
): ReadonlyMap<string, number> {
  const scope = new Map<string, number>();
  let current: unknown = expression;
  for (const step of path) {
    const fn =
      current !== null && typeof current === "object" && !Array.isArray(current)
        ? (current as Readonly<Record<string, unknown>>)["#function"]
        : undefined;
    if (step === "#function" && fn !== null && typeof fn === "object") {
      const parameters = (fn as { readonly parameters?: unknown }).parameters;
      for (const parameter of Array.isArray(parameters) ? parameters : []) {
        const { parameter_id: id, parameter_name: name } = parameter as {
          readonly parameter_id?: unknown;
          readonly parameter_name?: unknown;
        };
        if (typeof id === "number" && typeof name === "string") {
          scope.set(name, id);
        }
      }
    }
    current =
      current !== null && typeof current === "object"
        ? (current as Readonly<Record<string | number, unknown>>)[step]
        : undefined;
  }
  return scope;
}

/**
 * 推論した型 (`core.type-ast`) を `path` の位置に書く型の式にする. 型引数の参照はその位置から見える
 * 同じ名前の関数の引数の変数にする (見つからなければ `type_parameter` のまま)
 */
function inferredTypeArgumentExpression(
  expression: unknown,
  path: JsonPath,
  type: unknown,
): unknown {
  const scope = functionParametersInScope(expression, path);
  const replace = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(replace);
    }
    if (value === null || typeof value !== "object") {
      return value;
    }
    const record = value as Readonly<Record<string, unknown>>;
    if (typeof record["#type_parameter"] === "string") {
      const id = scope.get(record["#type_parameter"]);
      return id === undefined ? value : { "#variable": { variable_id: id } };
    }
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [key, replace(item)]),
    );
  };
  return replace(typeAstToExpression(type));
}

/**
 * 未確定の型引数を推論した型で埋めた式 (実行・コンパイルの前に使う). 推論できない未入力があれば `null`.
 * 未入力が無ければそのまま返す
 */
export function fillHoleTypeArguments(
  expression: unknown,
  probe: (probed: unknown) => HoleProbeResult,
): unknown {
  const inferred = inferHoleTypeArguments(expression, probe);
  if (inferred === null) {
    return null;
  }
  // 未入力を部分木に置き換えてもほかの未入力の位置 (JSON のパス) は変わらない
  return inferred.reduce(
    (filled, { path, type }) =>
      replaceAtJsonPath(
        filled,
        path,
        inferredTypeArgumentExpression(expression, path, type),
      ),
    expression,
  );
}

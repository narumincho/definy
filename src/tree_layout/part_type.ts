/**
 * パーツの型のツリーエディタまわりの補助. パーツの型は型の式 (`type_function` など) で持つ.
 * 型チェッカーの形 (`core.type-ast`) との変換は src/type_ast_expression.ts
 */
import { field, variant, variantPayload } from "../definy_value.ts";
import type { PartSnapshot } from "../types.ts";

export {
  expressionToTypeAst,
  typeAstToExpression,
} from "../type_ast_expression.ts";

/** 式の根が関数なら, その引数 (変数 ID と名前) の一覧 */
function rootParameters(expression: unknown): ReadonlyArray<{
  readonly id: unknown;
  readonly name: unknown;
}> | null {
  const parameters = field(
    variantPayload(expression, "function"),
    "parameters",
  );
  return Array.isArray(parameters)
    ? parameters.map((parameter) => ({
        id: field(parameter, "parameter_id"),
        name: field(parameter, "parameter_name"),
      }))
    : null;
}

/**
 * 式の根の関数の引数が `before` から `after` で変わったら (名前の変更・追加・削除・並び替え),
 * 関数のパーツの型の引数も同じ並びにした型を返す. 型の引数は式の引数と同じ位置のものを変数 ID で引き継ぎ,
 * 新しい引数の型は `number` にする. 呼び出し側は引数をパーツの型の引数名で渡すので, 型の引数名と式の引数名を揃えておく.
 * 変わっていなければ `undefined`
 */
export function syncPartTypeParameterNames(
  partType: unknown,
  before: unknown,
  after: unknown,
): unknown {
  const beforeParameters = rootParameters(before);
  const afterParameters = rootParameters(after);
  const fn = variantPayload(partType, "type_function") as
    | {
        readonly parameters?: ReadonlyArray<Readonly<Record<string, unknown>>>;
      }
    | undefined;
  if (
    beforeParameters === null ||
    afterParameters === null ||
    fn?.parameters === undefined ||
    beforeParameters.length !== fn.parameters.length ||
    (beforeParameters.length === afterParameters.length &&
      beforeParameters.every(
        (p, i) =>
          p.id === afterParameters[i]?.id &&
          p.name === afterParameters[i]?.name,
      ))
  ) {
    return undefined;
  }
  const typeParameters = fn.parameters;
  return variant("type_function", {
    ...fn,
    parameters: afterParameters.map((parameter) => {
      const index = beforeParameters.findIndex((p) => p.id === parameter.id);
      const typeParameter = index < 0 ? undefined : typeParameters[index];
      const name =
        typeof parameter.name === "string"
          ? parameter.name
          : String(typeParameter?.["name"] ?? "");
      return typeParameter === undefined
        ? { name, type: variant("type_number") }
        : { ...typeParameter, name };
    }),
  });
}

/**
 * パーツ ID → 関数のパーツの型の引数名 (宣言の順). 式のツリーで呼び出しの引数をこの順に表示するのに使う
 * (データ上の引数の順番は自由)
 */
export function callParameterNamesOf(
  partsByIdHash: ReadonlyMap<string, Pick<PartSnapshot, "partType">>,
): ReadonlyMap<string, ReadonlyArray<string>> {
  const result = new Map<string, ReadonlyArray<string>>();
  for (const [id, part] of partsByIdHash) {
    const parameters = field(
      variantPayload(part.partType, "type_function"),
      "parameters",
    );
    if (Array.isArray(parameters)) {
      result.set(
        id,
        parameters.map((parameter) => String(field(parameter, "name"))),
      );
    }
  }
  return result;
}

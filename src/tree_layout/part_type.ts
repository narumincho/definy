/**
 * パーツの型のツリーエディタまわりの補助. 型と型の式の相互変換は src/part_type_expression.ts
 */
import { field, variant, variantPayload } from "../definy_value.ts";
import type { PartSnapshot } from "../types.ts";

export {
  expressionToPartType,
  partTypeToExpression,
} from "../part_type_expression.ts";

/** 式の根が関数なら, その引数名の一覧 */
function rootParameterNames(
  expression: unknown,
): ReadonlyArray<unknown> | null {
  const parameters = field(
    variantPayload(expression, "function"),
    "parameters",
  );
  return Array.isArray(parameters)
    ? parameters.map((parameter) => field(parameter, "parameter_name"))
    : null;
}

/**
 * 式の根の関数の引数名が `before` から `after` で変わったら, 関数のパーツの型の同じ位置の引数名も変えた型を返す.
 * 呼び出し側は引数をパーツの型の引数名で渡すので, 型の引数名と式の引数名を揃えておく.
 * 変わっていなければ `undefined`
 */
export function syncPartTypeParameterNames(
  partType: unknown,
  before: unknown,
  after: unknown,
): unknown {
  const beforeNames = rootParameterNames(before);
  const afterNames = rootParameterNames(after);
  const fn = variantPayload(partType, "function") as
    | {
        readonly parameters?: ReadonlyArray<Readonly<Record<string, unknown>>>;
      }
    | undefined;
  if (
    beforeNames === null ||
    afterNames === null ||
    fn?.parameters === undefined ||
    beforeNames.length !== afterNames.length ||
    beforeNames.every((name, i) => name === afterNames[i])
  ) {
    return undefined;
  }
  return variant("function", {
    ...fn,
    parameters: fn.parameters.map((parameter, i) =>
      beforeNames[i] !== afterNames[i] && typeof afterNames[i] === "string"
        ? { ...parameter, name: afterNames[i] }
        : parameter,
    ),
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
      variantPayload(part.partType, "function"),
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

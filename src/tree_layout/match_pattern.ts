/**
 * match のアームのパターン (`core.pattern`. タグと束縛する変数, リテラル, `_`) の編集.
 * パターンは式ではないので置換メニューの選択肢と書き換えを式とは別に持つ.
 * エディタで編集できるのは 1 段のパターン (`_`, 変数, `tag`, `tag(x)`, リテラル) で,
 * `some(some(x))` のようにネストしたパターンは表示するだけ (タグを選び直すと 1 段のパターンになる)
 */
import type { PartSnapshot } from "../types.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import type { SelectorOption } from "./selector_options.ts";
import type { PathStep } from "./types.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { nextVariableId } from "./selection.ts";
import { EXPECTED_TYPE_PROBE } from "./type_inference.ts";
import { variant, variantOf } from "../definy_value.ts";
import {
  armBindsVariable,
  hole,
  isWildcardArm,
  literalArm,
  type MatchArm,
  type MatchArmKind,
  matchExpression,
  matchOf,
  NO_VARIABLE,
  wildcardArm,
} from "./expression.ts";
import { typeUnionDeclarationVariants, unionTypeVariants } from "./variant.ts";

/** match の対象の型の値の候補 (直和型の 1 つのタグ) */
export type PatternVariant = {
  readonly tag: string;
  /** 値を持つか. 持つならアームで変数に束縛できる */
  readonly hasPayload: boolean;
};

type MatchInner = {
  readonly target: unknown;
  readonly arms: ReadonlyArray<MatchArm>;
};

/**
 * match の対象が文字列のときのタグの候補 (無い). 文字列の match のアームのパターンは文字列リテラルで,
 * 検索欄に打った文字列をそのままパターンにする ({@link literalPatternOption}).
 * `_` (どれにでも一致) とは別のパターンなので, 文字列 `"_"` にも一致させられる
 */
const STRING_PATTERN_VARIANTS: ReadonlyArray<PatternVariant> = Object.freeze(
  [],
);

/** match の対象が数値のときのタグの候補 (無い). 検索欄に打った整数をそのままパターンにする */
export const NUMBER_PATTERN_VARIANTS: ReadonlyArray<PatternVariant> =
  Object.freeze([]);

/** match の対象が Bool のときのパターン (`true` / `false` のリテラル) */
const BOOLEAN_PATTERN_VARIANTS: ReadonlyArray<PatternVariant> = Object.freeze([
  { tag: "true", hasPayload: false },
  { tag: "false", hasPayload: false },
]);

/** match の対象が文字列か数値か (アームのパターンを検索欄に打ったリテラルにできるか) */
export function isLiteralPatternVariants(
  variants: ReadonlyArray<PatternVariant> | null,
): boolean {
  return (
    variants === STRING_PATTERN_VARIANTS || variants === NUMBER_PATTERN_VARIANTS
  );
}

/**
 * 文字列や数値の match のアームのパターンを, 検索欄の文字列 `query` のリテラルにする選択肢.
 * 空, または数値の match で整数でなければ無し
 */
export function literalPatternOption(
  query: string,
  variants: ReadonlyArray<PatternVariant> | null,
): SelectorOption | null {
  if (
    query === "" ||
    (variants === NUMBER_PATTERN_VARIANTS && !/^-?\d+$/.test(query))
  ) {
    return null;
  }
  return {
    value: `${TAG_PREFIX}${query}`,
    name: query,
    detail:
      variants === NUMBER_PATTERN_VARIANTS
        ? "number literal"
        : "string literal",
    category: "Pattern",
    returnType: "any",
  };
}

/** タグ (やリテラル) を選んだときのパターンの種類 */
function patternKindFor(
  variants: ReadonlyArray<PatternVariant> | null,
  arm: MatchArm | undefined,
): Exclude<MatchArmKind, "any" | "bind" | "nested"> {
  if (variants === STRING_PATTERN_VARIANTS) {
    return "string";
  }
  if (variants === NUMBER_PATTERN_VARIANTS) {
    return "number";
  }
  if (variants === BOOLEAN_PATTERN_VARIANTS) {
    return "boolean";
  }
  if (
    variants === null &&
    (arm?.kind === "string" ||
      arm?.kind === "number" ||
      arm?.kind === "boolean")
  ) {
    return arm.kind;
  }
  return "variant";
}

/** 置換メニューの選択肢の value の接頭辞 */
const TAG_PREFIX = "pattern:tag:";
/** どの値にも一致し束縛しない `_` にする */
export const PATTERN_ANY = "pattern:any";
export const PATTERN_BIND = "pattern:bind";
export const PATTERN_UNBIND = "pattern:unbind";
export const PATTERN_ADD_ARM = "pattern:add-arm";
export const PATTERN_ADD_MISSING_ARMS = "pattern:add-missing-arms";
export const PATTERN_DELETE_ARM = "pattern:delete-arm";
/** 末尾に `_ =>` のアームを足す */
export const PATTERN_ADD_DEFAULT = "pattern:add-default";

/** 束縛する変数の既定の名前 */
const DEFAULT_VARIABLE_NAME = "value";

function lastStepIndex(
  path: ReadonlyArray<PathStep>,
  kind: "matchArmPattern" | "matchArmVariable",
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === kind ? last.index : null;
}

/** `path` の最後がアームのパターン ({@link PathStep} の `matchArmPattern`) なら, そのアームの番号 */
function matchArmPatternIndex(path: ReadonlyArray<PathStep>): number | null {
  return lastStepIndex(path, "matchArmPattern");
}

/** `path` の最後が match のパターン (`_ =>` を含む) か. 選ぶとパターンの置換メニューを開く */
export function isMatchPatternPath(path: ReadonlyArray<PathStep>): boolean {
  return matchArmPatternIndex(path) !== null;
}

/** `path` の最後がアームで束縛する変数の名前 (`matchArmVariable`) なら, そのアームの番号 */
export function matchArmVariableIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  return lastStepIndex(path, "matchArmVariable");
}

function matchAt(
  expr: unknown,
  matchPath: ReadonlyArray<PathStep>,
): MatchInner | null {
  return matchOf(getExpressionAtPath(expr, matchPath)) ?? null;
}

/** match (`matchPath` の位置) のアームを書き換える */
function updateMatchAt(
  expr: unknown,
  matchPath: ReadonlyArray<PathStep>,
  updater: (match: MatchInner) => MatchInner,
): unknown {
  return updateExpressionAtPath(expr, matchPath, (node) => {
    const match = matchOf(node);
    if (match === undefined) {
      return node;
    }
    const next = updater(match);
    return matchExpression(next.target, next.arms);
  });
}

/**
 * match の対象の型を型チェッカーに聞くための式.
 * 対象 `t` を `[t, probe]` のリストにすると, 型チェッカーはリストの最初の要素の型を推論し,
 * 2 つ目の probe ではその型を期待する型として返す
 */
export function probeMatchTargetType(
  expr: unknown,
  patternPath: ReadonlyArray<PathStep>,
): unknown {
  const matchPath = patternPath.slice(0, -1);
  return updateMatchAt(expr, matchPath, (match) => ({
    ...match,
    target: variant("list", [match.target, EXPECTED_TYPE_PROBE]),
  }));
}

/**
 * 型チェッカーが返した match の対象の型 (`core.type-ast` の値) の取りうるタグ.
 * 型パーツの参照は `partsByIdHash` (パーツ ID → パーツ) の型宣言 (`type_union`) から求める.
 * 文字列なら {@link STRING_PATTERN_VARIANTS}, 数値なら {@link NUMBER_PATTERN_VARIANTS} (アームのパターンはリテラル).
 * 直和型でも文字列・数値・Bool でもなければ `null`
 */
export function patternVariantsFromTypeAst(
  type: DefinyValue | null,
  partsByIdHash: ReadonlyMap<string, Pick<PartSnapshot, "expression">>,
): ReadonlyArray<PatternVariant> | null {
  const tagged = variantOf(type);
  if (tagged?.tag === "string") {
    return STRING_PATTERN_VARIANTS;
  }
  if (tagged?.tag === "number") {
    return NUMBER_PATTERN_VARIANTS;
  }
  if (tagged?.tag === "boolean") {
    return BOOLEAN_PATTERN_VARIANTS;
  }
  if (tagged?.tag === "union" && Array.isArray(tagged.payload)) {
    return unionTypeVariants(tagged.payload);
  }
  if (tagged?.tag === "reference") {
    const partHash = (tagged.payload as { readonly part_hash?: unknown } | null)
      ?.part_hash;
    return typeUnionDeclarationVariants(
      partsByIdHash.get(String(partHash))?.expression,
    );
  }
  return null;
}

const armAction = (
  value: string,
  name: string,
  detail?: string,
): SelectorOption => ({
  value,
  name,
  detail,
  category: "Arm",
  returnType: "any",
});

/** アームのパターン (`_ =>` を含む) を選んだときの置換メニューの選択肢 */
export function patternSelectorOptions({
  expression,
  patternPath,
  variants,
}: {
  readonly expression: unknown;
  readonly patternPath: ReadonlyArray<PathStep>;
  /** match の対象の型のタグ. 分からなければ `null` */
  readonly variants: ReadonlyArray<PatternVariant> | null;
}): ReadonlyArray<SelectorOption> {
  const match = matchAt(expression, patternPath.slice(0, -1));
  if (match === null) {
    return [];
  }
  const arms = match.arms;
  const missing = missingVariants(match, variants);
  const missingArmsOption =
    missing.length > 0
      ? [
          armAction(
            PATTERN_ADD_MISSING_ARMS,
            "add-missing-arms",
            missing.map((v) => v.tag).join(", "),
          ),
        ]
      : [];
  const index = matchArmPatternIndex(patternPath);
  const arm = index === null ? undefined : arms[index];
  if (arm === undefined) {
    return [];
  }
  const usedTags = new Set(
    arms.filter((a) => !isWildcardArm(a)).map((a) => a.tag),
  );
  const hasWildcard = arms.some(isWildcardArm);
  const tagOptions = (variants ?? []).map((variant): SelectorOption => ({
    value: `${TAG_PREFIX}${variant.tag}`,
    name: variant.tag,
    detail:
      [
        variant.hasPayload ? "(value)" : undefined,
        variant.tag !== arm.tag && usedTags.has(variant.tag)
          ? "used"
          : undefined,
      ]
        .filter((d) => d !== undefined)
        .join(" ") || undefined,
    category: "Pattern",
    returnType: "any",
  }));
  // どの値にも一致する `_`
  tagOptions.push({
    value: PATTERN_ANY,
    name: "_",
    detail: "other values",
    category: "Pattern",
    returnType: "any",
  });
  // 対象の型が分からなくても今のタグは選べるようにする
  if (!isWildcardArm(arm) && !tagOptions.some((o) => o.name === arm.tag)) {
    tagOptions.unshift({
      value: `${TAG_PREFIX}${arm.tag}`,
      name: arm.tag,
      category: "Pattern",
      returnType: "any",
    });
  }
  // 値を持たないタグ・リテラル・ネストしたパターンは束縛できない. `_` は値全体を変数に束縛できる
  const canBind =
    isWildcardArm(arm) ||
    (arm.kind === "variant" &&
      variants?.find((v) => v.tag === arm.tag)?.hasPayload !== false);
  const actions: SelectorOption[] = [
    ...(armBindsVariable(arm)
      ? [armAction(PATTERN_UNBIND, "unbind", isWildcardArm(arm) ? "_" : "tag")]
      : canBind
        ? [
            armAction(
              PATTERN_BIND,
              "bind",
              isWildcardArm(arm) ? "value" : "tag(value)",
            ),
          ]
        : []),
    // 型のタグが分かっていて全てのアームがあるときは, 足すアームが無い
    ...(variants === null || missing.length > 0
      ? [armAction(PATTERN_ADD_ARM, "add-arm", missing[0]?.tag)]
      : []),
    ...missingArmsOption,
    ...(hasWildcard
      ? []
      : [armAction(PATTERN_ADD_DEFAULT, "add-default", "_ =>")]),
    // アームが 1 つも無い match は作れないので, 最後のアームは消せない
    ...(arms.length > 1 ? [armAction(PATTERN_DELETE_ARM, "delete-arm")] : []),
  ];
  return [...tagOptions, ...actions];
}

/** 今のパターンに対応する選択肢の value */
export function currentPatternOptionValue(
  expression: unknown,
  patternPath: ReadonlyArray<PathStep>,
): string | null {
  const match = matchAt(expression, patternPath.slice(0, -1));
  const index = matchArmPatternIndex(patternPath);
  const arm = index === null ? undefined : match?.arms?.[index];
  if (arm === undefined) {
    return null;
  }
  return isWildcardArm(arm) ? PATTERN_ANY : `${TAG_PREFIX}${arm.tag}`;
}

/** どのアームでも全ての値を扱っていないタグ. ネストしたパターン (`some(some(x))`) はタグの一部の値しか扱わない */
function missingVariants(
  match: MatchInner,
  variants: ReadonlyArray<PatternVariant> | null,
): ReadonlyArray<PatternVariant> {
  const used = new Set(
    match.arms
      .filter((arm) => !isWildcardArm(arm) && arm.kind !== "nested")
      .map((arm) => arm.tag),
  );
  return (variants ?? []).filter((variant) => !used.has(variant.tag));
}

/** 本体を未入力にした新しいアーム. 値を持つタグなら新しい変数に束縛する */
function newArm(
  variant: PatternVariant,
  variableId: number,
  kind: Exclude<MatchArmKind, "any" | "bind" | "nested">,
): MatchArm {
  const arm = literalArm(kind, variant.tag, hole());
  return variant.hasPayload
    ? { ...arm, variable_id: variableId, variable_name: DEFAULT_VARIABLE_NAME }
    : arm;
}

/**
 * アームのパターンの選択肢 (`patternSelectorOptions`) を適用する.
 * タグを変えたときは, 値を持つタグなら変数に束縛し (束縛していなければ新しい変数を作る),
 * 値を持たないタグなら束縛をやめる. 束縛をやめた変数を本体で使っていれば型チェッカーが型エラーにする
 */
export function applyPatternSelection(
  expr: unknown,
  patternPath: ReadonlyArray<PathStep>,
  value: string,
  variants: ReadonlyArray<PatternVariant> | null,
): unknown {
  if (!isMatchPatternPath(patternPath)) {
    return expr;
  }
  const index = matchArmPatternIndex(patternPath) ?? -1;
  const variableId = nextVariableId(expr);
  const bind = (arm: MatchArm): MatchArm =>
    !armBindsVariable(arm)
      ? {
          ...arm,
          kind: isWildcardArm(arm) ? "bind" : arm.kind,
          variable_id: variableId,
          variable_name: DEFAULT_VARIABLE_NAME,
        }
      : arm;
  const unbind = (arm: MatchArm): MatchArm => ({
    ...arm,
    kind: isWildcardArm(arm) ? "any" : arm.kind,
    variable_id: NO_VARIABLE,
    variable_name: "",
  });
  return updateMatchAt(expr, patternPath.slice(0, -1), (match) => {
    const arms = match.arms;
    const updateArm = (updater: (arm: MatchArm) => MatchArm): MatchInner => ({
      ...match,
      arms: arms.map((arm, i) => (i === index ? updater(arm) : arm)),
    });
    if (value === PATTERN_ANY) {
      return updateArm((arm) => wildcardArm(arm.body));
    }
    if (value.startsWith(TAG_PREFIX)) {
      const tag = value.slice(TAG_PREFIX.length);
      const found = variants?.find((v) => v.tag === tag);
      return updateArm((arm) => {
        const kind = patternKindFor(variants, arm);
        // `_` や変数への束縛, ネストしたパターンからは 1 段のタグのパターンにする
        const tagged: MatchArm =
          isWildcardArm(arm) || arm.kind === "nested" || kind !== "variant"
            ? literalArm(kind, tag, arm.body)
            : { ...arm, kind, tag };
        if (kind !== "variant") {
          return tagged;
        }
        if (found === undefined) {
          return tagged;
        }
        return found.hasPayload ? bind(tagged) : unbind(tagged);
      });
    }
    if (value === PATTERN_BIND) {
      return updateArm(bind);
    }
    if (value === PATTERN_UNBIND) {
      return updateArm(unbind);
    }
    if (value === PATTERN_ADD_ARM) {
      const variant = missingVariants(match, variants)[0] ?? {
        tag: arms[index]?.tag ?? "",
        hasPayload: false,
      };
      // `_ =>` より後のアームには一致しないので, `_ =>` の前に足す
      const wildcard = arms.findIndex(isWildcardArm);
      const at = wildcard >= 0 && wildcard <= index ? wildcard : index + 1;
      return {
        ...match,
        arms: [
          ...arms.slice(0, at),
          newArm(variant, variableId, patternKindFor(variants, arms[index])),
          ...arms.slice(at),
        ],
      };
    }
    if (value === PATTERN_ADD_MISSING_ARMS) {
      // `_ =>` より前に足す
      const wildcard = arms.findIndex(isWildcardArm);
      const at = wildcard >= 0 ? wildcard : arms.length;
      const kind = patternKindFor(variants, arms[index]);
      return {
        ...match,
        arms: [
          ...arms.slice(0, at),
          ...missingVariants(match, variants).map((variant, i) =>
            newArm(variant, variableId + i, kind),
          ),
          ...arms.slice(at),
        ],
      };
    }
    if (value === PATTERN_ADD_DEFAULT && !arms.some(isWildcardArm)) {
      return { ...match, arms: [...arms, wildcardArm(hole())] };
    }
    if (value === PATTERN_DELETE_ARM && index >= 0 && arms.length > 1) {
      return { ...match, arms: arms.filter((_, i) => i !== index) };
    }
    return match;
  });
}

/**
 * アームで束縛する変数 (`path` は `matchArmVariable` で終わる) の名前を変える.
 * 本体の変数は ID で参照しているので, 名前だけを変えればよい
 */
export function renameMatchArmVariable(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const index = matchArmVariableIndex(path);
  if (index === null) {
    return expr;
  }
  return updateMatchAt(expr, path.slice(0, -1), (match) => ({
    ...match,
    arms: match.arms.map((arm, i) =>
      i === index ? { ...arm, variable_name: name } : arm,
    ),
  }));
}

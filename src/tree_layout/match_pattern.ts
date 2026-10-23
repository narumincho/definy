/**
 * match のアームのパターン (タグと束縛する変数) の編集.
 * パターンは式ではないので置換メニューの選択肢と書き換えを式とは別に持つ
 */
import type { PartSnapshot } from "../types.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import type { SelectorOption } from "./selector_options.ts";
import type { PathStep } from "./types.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { nextVariableId } from "./selection.ts";
import { EXPECTED_TYPE_PROBE } from "./type_inference.ts";

/** match の対象の型の値の候補 (直和型の 1 つのタグ) */
export type PatternVariant = {
  readonly tag: string;
  /** 値を持つか. 持つならアームで変数に束縛できる */
  readonly hasPayload: boolean;
};

type MatchArm = {
  readonly tag?: unknown;
  readonly variable_id?: unknown;
  readonly variable_name?: unknown;
  readonly body?: unknown;
};

type MatchInner = {
  readonly target?: unknown;
  readonly arms?: ReadonlyArray<MatchArm>;
  readonly default?: unknown;
};

/** 置換メニューの選択肢の value の接頭辞 */
const TAG_PREFIX = "pattern:tag:";
export const PATTERN_BIND = "pattern:bind";
export const PATTERN_UNBIND = "pattern:unbind";
export const PATTERN_ADD_ARM = "pattern:add-arm";
export const PATTERN_ADD_MISSING_ARMS = "pattern:add-missing-arms";
export const PATTERN_DELETE_ARM = "pattern:delete-arm";
/** `_ =>` (default) のパターンそのものの選択肢 */
export const PATTERN_DEFAULT = "pattern:default";
export const PATTERN_ADD_DEFAULT = "pattern:add-default";
export const PATTERN_DELETE_DEFAULT = "pattern:delete-default";

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
export function matchArmPatternIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  return lastStepIndex(path, "matchArmPattern");
}

/** `path` の最後が `_ =>` (default) のパターン (`matchDefaultPattern`) か */
export function isMatchDefaultPatternPath(
  path: ReadonlyArray<PathStep>,
): boolean {
  return path[path.length - 1] === "matchDefaultPattern";
}

/** `path` の最後が match のパターン (タグのアームか `_ =>`) か. 選ぶとパターンの置換メニューを開く */
export function isMatchPatternPath(path: ReadonlyArray<PathStep>): boolean {
  return matchArmPatternIndex(path) !== null || isMatchDefaultPatternPath(path);
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
  const node = getExpressionAtPath(expr, matchPath);
  if (node === null || typeof node !== "object" || !("Match" in node)) {
    return null;
  }
  return (node as { readonly Match: MatchInner }).Match;
}

/** match (`matchPath` の位置) のアームを書き換える */
function updateMatchAt(
  expr: unknown,
  matchPath: ReadonlyArray<PathStep>,
  updater: (match: MatchInner) => MatchInner,
): unknown {
  return updateExpressionAtPath(expr, matchPath, (node) => {
    const match = (node as { readonly Match?: MatchInner } | null)?.Match;
    return match === undefined ? node : { Match: updater(match) };
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
    target: { ListLiteral: { items: [match.target, EXPECTED_TYPE_PROBE] } },
  }));
}

/**
 * 型チェッカーが返した match の対象の型 (`core.type-ast` の値) の取りうるタグ.
 * 型パーツの参照は `partsByIdHash` (パーツ ID → パーツ) の型宣言 (`TypeUnion`) から求める. 直和型でなければ `null`
 */
export function patternVariantsFromTypeAst(
  type: DefinyValue | null,
  partsByIdHash: ReadonlyMap<string, Pick<PartSnapshot, "expression">>,
): ReadonlyArray<PatternVariant> | null {
  const { tag, payload } = (type ?? {}) as {
    readonly tag?: unknown;
    readonly payload?: unknown;
  };
  if (tag === "boolean") {
    return [
      { tag: "true", hasPayload: false },
      { tag: "false", hasPayload: false },
    ];
  }
  if (tag === "union" && Array.isArray(payload)) {
    return payload.map(
      (variant: {
        readonly tag?: unknown;
        readonly payload_type?: { readonly tag?: unknown };
      }) => ({
        tag: String(variant.tag),
        hasPayload: variant.payload_type?.tag === "some",
      }),
    );
  }
  if (tag === "reference") {
    const partHash = (payload as { readonly part_hash?: unknown } | null)
      ?.part_hash;
    const declaration = partsByIdHash.get(String(partHash))?.expression as {
      readonly TypeUnion?: {
        readonly variants?: ReadonlyArray<{
          readonly tag?: unknown;
          readonly payload_type?: unknown;
        }>;
      };
    } | null;
    const variants = declaration?.TypeUnion?.variants;
    return Array.isArray(variants)
      ? variants.map((variant) => ({
          tag: String(variant.tag),
          hasPayload: variant.payload_type != null,
        }))
      : null;
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
  const arms = match.arms ?? [];
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
  if (isMatchDefaultPatternPath(patternPath)) {
    if (match.default == null) {
      return [];
    }
    return [
      {
        value: PATTERN_DEFAULT,
        name: "_",
        detail: "other tags",
        category: "Pattern",
        returnType: "any",
      },
      ...missingArmsOption,
      // アームが 1 つも無い match は作れないので, そのときは消せない
      ...(arms.length > 0
        ? [armAction(PATTERN_DELETE_DEFAULT, "delete-default")]
        : []),
    ];
  }
  const index = matchArmPatternIndex(patternPath);
  const arm = index === null ? undefined : arms[index];
  if (arm === undefined) {
    return [];
  }
  const usedTags = new Set(arms.map((a) => String(a.tag)));
  const tagOptions = (variants ?? []).map((variant): SelectorOption => ({
    value: `${TAG_PREFIX}${variant.tag}`,
    name: variant.tag,
    detail:
      [
        variant.hasPayload ? "(value)" : undefined,
        variant.tag !== String(arm.tag) && usedTags.has(variant.tag)
          ? "used"
          : undefined,
      ]
        .filter((d) => d !== undefined)
        .join(" ") || undefined,
    category: "Pattern",
    returnType: "any",
  }));
  // 対象の型が分からなくても今のタグは選べるようにする
  if (!tagOptions.some((o) => o.name === String(arm.tag))) {
    tagOptions.unshift({
      value: `${TAG_PREFIX}${String(arm.tag)}`,
      name: String(arm.tag),
      category: "Pattern",
      returnType: "any",
    });
  }
  const actions: SelectorOption[] = [
    arm.variable_id == null
      ? armAction(PATTERN_BIND, "bind", "tag(value)")
      : armAction(PATTERN_UNBIND, "unbind", "tag"),
    // 型のタグが分かっていて全てのアームがあるときは, 足すアームが無い
    ...(variants === null || missing.length > 0
      ? [armAction(PATTERN_ADD_ARM, "add-arm", missing[0]?.tag)]
      : []),
    ...missingArmsOption,
    ...(match.default == null
      ? [armAction(PATTERN_ADD_DEFAULT, "add-default", "_ =>")]
      : []),
    ...(arms.length > 1 || match.default != null
      ? [armAction(PATTERN_DELETE_ARM, "delete-arm")]
      : []),
  ];
  return [...tagOptions, ...actions];
}

/** 今のパターンに対応する選択肢の value */
export function currentPatternOptionValue(
  expression: unknown,
  patternPath: ReadonlyArray<PathStep>,
): string | null {
  const match = matchAt(expression, patternPath.slice(0, -1));
  if (isMatchDefaultPatternPath(patternPath)) {
    return match?.default == null ? null : PATTERN_DEFAULT;
  }
  const index = matchArmPatternIndex(patternPath);
  const arm = index === null ? undefined : match?.arms?.[index];
  return arm === undefined ? null : `${TAG_PREFIX}${String(arm.tag)}`;
}

/** どのアームにもないタグ */
function missingVariants(
  match: MatchInner,
  variants: ReadonlyArray<PatternVariant> | null,
): ReadonlyArray<PatternVariant> {
  const used = new Set((match.arms ?? []).map((arm) => String(arm.tag)));
  return (variants ?? []).filter((variant) => !used.has(variant.tag));
}

/** 本体を未入力にした新しいアーム. 値を持つタグなら新しい変数に束縛する */
function newArm(variant: PatternVariant, variableId: number): MatchArm {
  return {
    tag: variant.tag,
    variable_id: variant.hasPayload ? variableId : null,
    variable_name: variant.hasPayload ? DEFAULT_VARIABLE_NAME : null,
    body: { Hole: {} },
  };
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
    arm.variable_id == null
      ? {
          ...arm,
          variable_id: variableId,
          variable_name: DEFAULT_VARIABLE_NAME,
        }
      : arm;
  const unbind = (arm: MatchArm): MatchArm => ({
    ...arm,
    variable_id: null,
    variable_name: null,
  });
  return updateMatchAt(expr, patternPath.slice(0, -1), (match) => {
    const arms = match.arms ?? [];
    const updateArm = (updater: (arm: MatchArm) => MatchArm): MatchInner => ({
      ...match,
      arms: arms.map((arm, i) => (i === index ? updater(arm) : arm)),
    });
    if (value.startsWith(TAG_PREFIX)) {
      const tag = value.slice(TAG_PREFIX.length);
      const variant = variants?.find((v) => v.tag === tag);
      return updateArm((arm) => {
        const tagged = { ...arm, tag };
        if (variant === undefined) {
          return tagged;
        }
        return variant.hasPayload ? bind(tagged) : unbind(tagged);
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
        tag: String(arms[index]?.tag ?? ""),
        hasPayload: false,
      };
      // `_ =>` からは最後に足す
      const at = index >= 0 ? index + 1 : arms.length;
      return {
        ...match,
        arms: [
          ...arms.slice(0, at),
          newArm(variant, variableId),
          ...arms.slice(at),
        ],
      };
    }
    if (value === PATTERN_ADD_MISSING_ARMS) {
      return {
        ...match,
        arms: [
          ...arms,
          ...missingVariants(match, variants).map((variant, i) =>
            newArm(variant, variableId + i),
          ),
        ],
      };
    }
    if (value === PATTERN_ADD_DEFAULT && match.default == null) {
      return { ...match, default: { Hole: {} } };
    }
    if (
      value === PATTERN_DELETE_ARM &&
      index >= 0 &&
      (arms.length > 1 || match.default != null)
    ) {
      return { ...match, arms: arms.filter((_, i) => i !== index) };
    }
    if (value === PATTERN_DELETE_DEFAULT && arms.length > 0) {
      return { ...match, default: null };
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
    arms: (match.arms ?? []).map((arm, i) =>
      i === index ? { ...arm, variable_name: name } : arm,
    ),
  }));
}

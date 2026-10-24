/**
 * 式のツリーエディタの置換メニュー (ドロップダウン) の選択肢と, 検索・ハイライトの規則.
 * DOM に依存しない純粋な関数にしてテストできるようにしている.
 */
import type { ExpectedType } from "./type_inference.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import type { PartSnapshot } from "../types.ts";
import type { PathStep } from "./types.ts";
import { getExpressionAtPath } from "./mutation.ts";
import { variantOptionValueByName } from "./variant.ts";
import { field, isVariant, variantOf } from "../definy_value.ts";

export type SelectorOption = {
  readonly value: string;
  /** 検索の対象で, 入力欄に入れる名前 (`plus`, `core.eval-ast` など) */
  readonly name: string;
  /** 名前の横に薄く出す補足 (`+` など) */
  readonly detail?: string | undefined;
  readonly category: string;
  readonly returnType: ExpectedType;
  /** パーツの選択肢ならパーツのページの ID (`module.name`). 右端にリンクを出す */
  readonly partId?: string | undefined;
};

export const BASE_SELECTOR_OPTIONS: ReadonlyArray<SelectorOption> = [
  {
    value: "expr:number",
    name: "number",
    detail: "0",
    category: "Literal",
    returnType: "number",
  },
  {
    value: "expr:string",
    name: "string",
    detail: '""',
    category: "Literal",
    returnType: "string",
  },
  {
    value: "expr:boolean:true",
    name: "true",
    category: "Literal",
    returnType: "boolean",
  },
  {
    value: "expr:boolean:false",
    name: "false",
    category: "Literal",
    returnType: "boolean",
  },
  {
    value: "expr:list",
    name: "list",
    detail: "[]",
    category: "Literal",
    returnType: "list",
  },
  {
    value: "expr:secret",
    name: "secret",
    detail: "API トークンなど",
    category: "Literal",
    returnType: "any",
  },
  {
    value: "expr:quote",
    name: "quote",
    detail: "Code<T>",
    category: "Syntax",
    returnType: "any",
  },
  {
    value: "expr:let",
    name: "let",
    detail: "x = 0",
    category: "Syntax",
    returnType: "any",
  },
  {
    value: "expr:match",
    name: "match",
    detail: "tag => ...",
    category: "Syntax",
    returnType: "any",
  },
  {
    value: "expr:match_boolean",
    name: "match-bool",
    detail: "true / false",
    category: "Syntax",
    returnType: "any",
  },
];

/** 型 (`core.type-ast` の値) の大まかな型. 関数の型は戻り値の型 */
function partReturnType(partType: unknown): ExpectedType {
  const tagged = variantOf(partType);
  switch (tagged?.tag) {
    case "number":
    case "string":
    case "boolean":
    case "list":
      return tagged.tag;
    case "function": {
      const ret = variantOf(field(tagged.payload, "return_type"))?.tag;
      return ret === "number" || ret === "string" || ret === "boolean"
        ? ret
        : "any";
    }
  }
  return "any";
}

/** 型のツリーエディタ (パーツの型の行) の選択肢 */
export const TYPE_SELECTOR_OPTIONS: ReadonlyArray<SelectorOption> = [
  {
    value: "expr:type:number",
    name: "number",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:string",
    name: "string",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:boolean",
    name: "boolean",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:secret",
    name: "secret",
    detail: "API トークンなど",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:type",
    name: "type",
    detail: "型そのもの",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:list",
    name: "list",
    detail: "List<number>",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:code",
    name: "code",
    detail: "Code<number>",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:function",
    name: "function",
    detail: "x: number → number",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:record",
    name: "record",
    detail: "{ key: string }",
    category: "Type",
    returnType: "any",
  },
  {
    value: "expr:type:union",
    name: "union",
    detail: "a | b",
    category: "Type",
    returnType: "any",
  },
];

/** 型のパーツ (partType が `type`) の選択肢. 型の行で `reference({ part_hash: ID })` として参照する */
export function typePartSelectorOptions(
  parts: ReadonlyArray<PartSnapshot>,
): ReadonlyArray<SelectorOption> {
  return partSelectorOptions(
    parts.filter((p) => isVariant(p.partType, "type")),
  ).map((option) => ({ ...option, detail: undefined, category: "Type part" }));
}

/** パーツの型の短い表記 (`number`, `function` など). 選択肢の名前の横に出す */
export function partTypeText(partType: unknown): string | undefined {
  const tagged = variantOf(partType);
  if (tagged === undefined) {
    return undefined;
  }
  if (tagged.tag === "function") {
    const ret = partTypeText(field(tagged.payload, "return_type"));
    return ret === undefined ? "function" : `function → ${ret}`;
  }
  return tagged.tag;
}

/** パーツの選択肢. value は `ref:part:<パーツ ID の Base64URL>` */
export function partSelectorOptions(
  parts: ReadonlyArray<PartSnapshot>,
): ReadonlyArray<SelectorOption> {
  return parts.flatMap((p) =>
    p.partIdHash
      ? [
          {
            value: `ref:part:${p.partIdHash}`,
            name: `${p.moduleName}.${p.name}`,
            detail: partTypeText(p.partType),
            category: "Part",
            returnType: partReturnType(p.partType),
            partId: p.partId,
          },
        ]
      : [],
  );
}

/** その位置から参照できる変数 (関数のパラメーター, let の束縛, match の束縛) の選択肢 */
export function variableSelectorOptions(
  scopeVariables: ReadonlyMap<number, string>,
): ReadonlyArray<SelectorOption> {
  return [...scopeVariables].map(([id, name]) => ({
    value: `ref:local:${id}`,
    name,
    detail: `#${id}`,
    category: "Local",
    returnType: "any",
  }));
}

/** 期待型に合わない選択肢か. 合わないものは区切りの下に薄く出す */
export function isTypeMismatch(
  option: SelectorOption,
  expectedType: ExpectedType,
): boolean {
  return (
    expectedType !== "any" &&
    option.returnType !== "any" &&
    option.returnType !== expectedType
  );
}

/**
 * 検索語で選択肢を絞り込み, 並べ替える.
 * 検索語があれば, 名前が検索語と一致するもの, 名前 (または `module.` を除いた名前) が検索語で始まるもの,
 * 名前に含むもの, 補足・分類のどこかに含むものの順に並べる.
 * 例えば `index` と打てば変数 `index` がパーツ `std.string-index-of` より先に来る.
 * 期待型に合わない選択肢は一致度に関わらず後ろにまとめ, 同じ順位の中では元の順序を保つ
 */
export function filterAndRankOptions(
  options: ReadonlyArray<SelectorOption>,
  query: string,
  expectedType: ExpectedType,
): ReadonlyArray<SelectorOption> {
  const q = query.trim().toLowerCase();
  const ranked = options.flatMap((option, index) => {
    const name = option.name.toLowerCase();
    const shortName = name.slice(name.lastIndexOf(".") + 1);
    let rank: number;
    if (q === "") {
      rank = 0;
    } else if (name === q || shortName === q) {
      rank = 0;
    } else if (name.startsWith(q) || shortName.startsWith(q)) {
      rank = 1;
    } else if (name.includes(q)) {
      rank = 2;
    } else if (
      `${option.detail ?? ""} ${option.category}`.toLowerCase().includes(q)
    ) {
      rank = 3;
    } else {
      return [];
    }
    return [
      {
        option,
        index,
        mismatch: isTypeMismatch(option, expectedType) ? 1 : 0,
        rank,
      },
    ];
  });
  ranked.sort(
    (a, b) => a.mismatch - b.mismatch || a.rank - b.rank || a.index - b.index,
  );
  return ranked.map((r) => r.option);
}

/**
 * ドロップダウンのハイライト状態.
 * - chosen: 矢印キーや検索語の入力でユーザーが選んだ選択肢. Enter で適用する
 * - implicit: 開いた直後に現在値を示しているだけ. Enter では適用しない
 */
export type Highlight =
  | { readonly kind: "chosen"; readonly index: number }
  | { readonly kind: "implicit"; readonly index: number }
  | { readonly kind: "none" };

export function resolveHighlight(
  chosenIndex: number | null,
  filtered: ReadonlyArray<SelectorOption>,
  currentValue: string | null,
): Highlight {
  if (chosenIndex !== null && chosenIndex < filtered.length) {
    return { kind: "chosen", index: chosenIndex };
  }
  const index = filtered.findIndex((o) => o.value === currentValue);
  return index >= 0 ? { kind: "implicit", index } : { kind: "none" };
}

export function highlightIndex(highlight: Highlight): number | null {
  return highlight.kind === "none" ? null : highlight.index;
}

/** その位置の選択肢を組み立てる */
export function buildSelectorOptions({
  mode,
  scopeVariables,
  partOptions,
  variantOptions = [],
}: {
  readonly mode: "expression" | "type";
  readonly scopeVariables?: ReadonlyMap<number, string> | undefined;
  readonly partOptions: ReadonlyArray<SelectorOption>;
  /** Variant (タグ付きの値) の選択肢. 構文の後, パーツの前に並べる */
  readonly variantOptions?: ReadonlyArray<SelectorOption>;
}): ReadonlyArray<SelectorOption> {
  if (mode === "type") {
    return [...TYPE_SELECTOR_OPTIONS, ...partOptions];
  }
  return [
    ...variableSelectorOptions(scopeVariables ?? new Map()),
    ...BASE_SELECTOR_OPTIONS,
    ...variantOptions,
    ...partOptions,
  ];
}

/** その位置の式に対応する選択肢の value を求める */
export function resolveCurrentOptionValue({
  expression,
  path,
  options,
  partNames,
}: {
  readonly expression: unknown;
  readonly path: ReadonlyArray<PathStep>;
  readonly options: ReadonlyArray<SelectorOption>;
  readonly mode: "expression" | "type";
  readonly partNames: ReadonlyMap<string, string>;
}): string | null {
  const value = getOptionValueForExpression(
    getExpressionAtPath(expression, path),
  );
  if (value === null || options.some((o) => o.value === value)) {
    return value;
  }
  if (value.startsWith("variant:")) {
    return variantOptionValueByName(value, options, partNames) ?? value;
  }
  if (!value.startsWith("ref:part:")) {
    return value;
  }
  // 参照しているパーツ ID が選択肢の ID と違う (別のアカウントのコミットなど) ときは名前で対応させる
  const partId = partNames.get(value.slice("ref:part:".length));
  return options.find((o) => o.partId === partId)?.value ?? value;
}

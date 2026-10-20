/**
 * 式のツリーエディタの置換メニュー (ドロップダウン) の選択肢と, 検索・ハイライトの規則.
 * DOM に依存しない純粋な関数にしてテストできるようにしている.
 */
import type { ExpectedType } from "./type_inference.ts";
import type { PartSnapshot } from "../types.ts";

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
    value: "expr:add",
    name: "plus",
    detail: "+",
    category: "Operator",
    returnType: "number",
  },
  {
    value: "expr:subtract",
    name: "minus",
    detail: "-",
    category: "Operator",
    returnType: "number",
  },
  {
    value: "expr:multiply",
    name: "multiply",
    detail: "*",
    category: "Operator",
    returnType: "number",
  },
  {
    value: "expr:divide",
    name: "divide",
    detail: "/",
    category: "Operator",
    returnType: "number",
  },
  {
    value: "expr:remainder",
    name: "remainder",
    detail: "%",
    category: "Operator",
    returnType: "number",
  },
  {
    value: "expr:equal",
    name: "equal",
    detail: "==",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:not_equal",
    name: "not-equal",
    detail: "!=",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:less_than",
    name: "less-than",
    detail: "<",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:greater_than",
    name: "greater-than",
    detail: ">",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:and",
    name: "and",
    detail: "&&",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:or",
    name: "or",
    detail: "||",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:not",
    name: "not",
    detail: "!",
    category: "Operator",
    returnType: "boolean",
  },
  {
    value: "expr:string_concat",
    name: "string-concat",
    category: "Operator",
    returnType: "string",
  },
  {
    value: "expr:if",
    name: "if",
    detail: "cond, then, else",
    category: "Syntax",
    returnType: "any",
  },
  {
    value: "expr:hole",
    name: "□",
    detail: "未入力",
    category: "Syntax",
    returnType: "any",
  },
];

function partReturnType(partType: unknown): ExpectedType {
  if (
    partType === "number" ||
    partType === "string" ||
    partType === "boolean" ||
    partType === "list"
  ) {
    return partType;
  }
  if (typeof partType === "object" && partType !== null) {
    const obj = partType as Record<string, unknown>;
    if ("function" in obj) {
      const ret = (obj.function as { return_type?: unknown }).return_type;
      if (ret === "number" || ret === "string" || ret === "boolean") {
        return ret;
      }
    }
  }
  return "any";
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

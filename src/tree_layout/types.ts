/**
 * 式の木構造エディタ (Tree Layout Editor) の型定義
 */

export type NodeKind =
  | "literalNumber"
  | "literalString"
  | "literalBoolean"
  | "identifier"
  /** 関数の引数名・let や match で束縛する変数の名前. 選ぶとその場で名前を変えられる */
  | "parameterName"
  | "keyword"
  /** `=` (let の束縛) や `→` (関数の型) などの記号 */
  | "symbol"
  | "delimiter"
  | "group"
  | "block"
  | "table";

export type LayoutMode = "inline" | "multiline";

export type PathStep =
  | { readonly kind: "letBindingValue"; readonly index: number }
  /** let の i 番目の束縛の変数名. 式ではない */
  | { readonly kind: "letBindingName"; readonly index: number }
  | "letBody"
  | { readonly kind: "listItemValue"; readonly index: number }
  | { readonly kind: "recordItemValue"; readonly index: number }
  /** レコード (`record` / `type_record`) の i 番目のフィールドの名前. 式ではない */
  | { readonly kind: "recordItemKey"; readonly index: number }
  /** フィールドの取り出し (`record_get`) のフィールドの名前. 式ではない */
  | "recordGetKey"
  | "typeListItem"
  /** `Code<T>` の型の T */
  | "typeCodeValue"
  /** quote 式の中の式 (コードそのもの) */
  | "quoteExpression"
  | "functionBody"
  | { readonly kind: "callArgument"; readonly index: number }
  | { readonly kind: "typeFunctionParameter"; readonly index: number }
  /** 関数 (`function`) の引数の名前. 式ではない */
  | { readonly kind: "functionParameter"; readonly index: number }
  | "typeFunctionReturn"
  | "variantPayload"
  | "matchTarget"
  | { readonly kind: "matchArmBody"; readonly index: number }
  /** match のアームのパターン (タグ). 式ではない */
  | { readonly kind: "matchArmPattern"; readonly index: number }
  /** match のアームで束縛する変数の名前. 式ではない */
  | { readonly kind: "matchArmVariable"; readonly index: number }
  | { readonly kind: "typeUnionVariant"; readonly index: number }
  | "record";

export type LayoutNode = {
  readonly id: string;
  readonly path: ReadonlyArray<PathStep>;
  readonly label: string;
  readonly kind: NodeKind;
  readonly children: ReadonlyArray<LayoutNode>;
  readonly computedWidth: number;
  readonly computedHeight: number;
  readonly layoutMode: LayoutMode;
  readonly columnsWidth?: ReadonlyArray<number>;
  readonly tableHeaders?: ReadonlyArray<string>;
  /**
   * 式 1 つ分のノード (式全体を表すノード) にだけ付く, その位置から参照できる変数 (ID → 名前).
   * 置換メニューの変数の選択肢に使う
   */
  readonly scopeVariables?: ReadonlyMap<number, string>;
  /** 式 1 つ分のノードにだけ付く, その位置から参照できる型引数 (関数の型の引数で型が type のもの) の名前 */
  readonly typeParameters?: ReadonlyArray<string>;
  /** 未入力の枠に薄く出す補足 (推論した型引数. type_argument_inference.ts) */
  readonly hint?: string;
};

export type LayoutOptions = {
  readonly maxWidth: number;
  readonly charWidth: number;
  readonly lineHeight: number;
  readonly indentSize: number;
  readonly chipPaddingX: number;
};

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  maxWidth: 680,
  charWidth: 8.5,
  lineHeight: 26,
  indentSize: 20,
  chipPaddingX: 8,
};

export function pathStepToString(step: PathStep): string {
  if (typeof step === "string") {
    return step;
  }
  return `${step.kind}:${step.index}`;
}

export function pathToString(path: ReadonlyArray<PathStep>): string {
  if (path.length === 0) return "root";
  return path.map(pathStepToString).join("/");
}

export function isSamePathStep(a: PathStep, b: PathStep): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }
  if (typeof a === "object" && typeof b === "object") {
    return a.kind === b.kind && a.index === b.index;
  }
  return false;
}

export function isSamePath(
  a: ReadonlyArray<PathStep>,
  b: ReadonlyArray<PathStep>,
): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, i) => {
    const target = b[i];
    return target !== undefined && isSamePathStep(step, target);
  });
}

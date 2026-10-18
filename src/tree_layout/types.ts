/**
 * 式の木構造エディタ (Tree Layout Editor) の型定義
 */

export type NodeKind =
  | "literalNumber"
  | "literalString"
  | "literalBoolean"
  | "identifier"
  | "keyword"
  | "operator"
  | "delimiter"
  | "group"
  | "block"
  | "table";

export type LayoutMode = "inline" | "multiline";

export type PathStep =
  | "left"
  | "right"
  | "condition"
  | "then"
  | "else"
  | "letValue"
  | { readonly kind: "letBindingValue"; readonly index: number }
  | "letBody"
  | { readonly kind: "listItemValue"; readonly index: number }
  | { readonly kind: "recordItemValue"; readonly index: number }
  | "constructorValue"
  | "typeListItem"
  | "start"
  | "end"
  | "index"
  | "item"
  | "functionBody"
  | "callFunction"
  | { readonly kind: "callArgument"; readonly index: number }
  | { readonly kind: "typeFunctionParameter"; readonly index: number }
  | "typeFunctionReturn"
  | "variantPayload"
  | "matchTarget"
  | { readonly kind: "matchArmBody"; readonly index: number }
  | "matchDefault"
  | { readonly kind: "typeUnionVariant"; readonly index: number }
  | "record";

export interface LayoutNode {
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
}

export interface LayoutOptions {
  readonly maxWidth: number;
  readonly charWidth: number;
  readonly lineHeight: number;
  readonly indentSize: number;
  readonly chipPaddingX: number;
}

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

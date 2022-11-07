/// <reference lib="dom" />
import { murmurHash3 } from "https://deno.land/x/murmur_hash_3@1.0.0/mod.ts";

const definyCssInJsId = "definy-css-in-js";

export type Style = {
  readonly cursor?: "pointer" | "not-allowed" | undefined;
  readonly border?: "none" | undefined;
  readonly padding?: number | undefined;
  readonly textAlign?: "left" | undefined;
  readonly fontSize?: number | undefined;
  readonly backgroundColor?: string | undefined;
  readonly color?: string | undefined;
  readonly borderRadius?: number | undefined;
};

const stylePropertyNameCamelCaseToKebabCaseMap: ReadonlyMap<string, string> =
  new Map<keyof Style, string>([
    ["textAlign", "text-align"],
    ["fontSize", "font-size"],
    ["backgroundColor", "background-color"],
    ["borderRadius", "border-radius"],
  ]);

export type StateStyle = {
  readonly hover: Style;
  readonly disabled: Style;
};

export type StyleAndHash = {
  readonly style: Style;
  readonly stateStyle: StateStyle;
  readonly hash: string;
};

export const resetInsertedStyle = (): void => {
  insertedStyle.clear();
};

/**
 * すでに追加したスタイルの辞書
 *
 * SSRのために, スタイル本体まで保持している
 */
const insertedStyle = new Map<
  string,
  { readonly style: Style; readonly state: StateStyle }
>();

/**
 * スタイルのハッシュ値を計算する. c に渡すことによって `className` を得ることができる
 *
 * コンポーネントの外で使うとパフォーマンスが良くなるが, 動的な場合は中で使うことができる
 */
export const toStyleAndHash = (
  style: Style,
  state?: Partial<StateStyle>
): StyleAndHash => {
  const stateStyle: StateStyle = {
    hover: state?.hover ?? {},
    disabled: state?.disabled ?? {},
  };
  const hash = hashStyle(style, stateStyle);
  return {
    style,
    stateStyle,
    hash,
  };
};

/**
 * CSS からクラス名を生成する
 *
 * Deno で esbuild でバンドルしたときに styled-component, emotion など動かなかっため自作した
 */
export const c = (styleAndHash: StyleAndHash): string => {
  const className = "d_" + styleAndHash.hash;
  if (insertedStyle.has(styleAndHash.hash)) {
    return className;
  }
  insertedStyle.set(styleAndHash.hash, {
    style: styleAndHash.style,
    state: styleAndHash.stateStyle,
  });
  if (globalThis.document === undefined) {
    return className;
  }
  const cssString = styleAndStateStyleToCssString(
    className,
    styleAndHash.style,
    styleAndHash.stateStyle
  );
  console.log(cssString);
  const styleElement = document.getElementById(definyCssInJsId);
  if (styleElement instanceof HTMLStyleElement) {
    styleElement.textContent = cssString;
    return className;
  }
  const createdStyleElement = document.createElement("style");
  document.head.appendChild(createdStyleElement);
  createdStyleElement.textContent = cssString;
  return className;
};

const hashStyle = (style: Style, state: StateStyle): string => {
  return murmurHash3(JSON.stringify({ style, state })).toString(16);
};

const styleAndStateStyleToCssString = (
  className: string,
  style: Style,
  stateStyle: StateStyle
): string => {
  return (
    styleToCssString("." + className, style) +
    styleToCssString("." + className + ":hover", stateStyle.hover) +
    styleToCssString("." + className + ":disabled", stateStyle.disabled)
  );
};

const styleToCssString = (selector: string, style: Style): string => {
  const declarations = Object.entries(style);
  if (declarations.length === 0) {
    return "";
  }

  return (
    selector +
    " {\n" +
    declarations
      .map(([key, value]) => {
        if (value === undefined) {
          return "";
        }
        return (
          (stylePropertyNameCamelCaseToKebabCaseMap.get(key) ?? key) +
          ":" +
          (typeof value === "number" && value !== 0 ? value + "px" : value) +
          ";"
        );
      })
      .join("\n") +
    "\n}"
  );
};

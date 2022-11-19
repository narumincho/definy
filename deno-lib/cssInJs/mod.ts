import { murmurHash3 } from "https://deno.land/x/murmur_hash_3@1.0.0/mod.ts";

const definyCssInJsId = "definy-css-in-js";

export type Style = {
  readonly cursor?: "pointer" | "not-allowed" | undefined;
  readonly border?: "none" | undefined;
  readonly padding?: number | string | undefined;
  readonly margin?: 0 | undefined;
  readonly textAlign?: "left" | undefined;
  readonly fontSize?: number | undefined;
  /** px をつけないようにするため */
  readonly lineHeight?: "1" | undefined;
  readonly backgroundColor?: string | undefined;
  readonly color?: string | undefined;
  readonly borderRadius?: number | undefined;
  readonly width?: number | string | undefined;
  readonly height?: number | string | undefined;
  readonly boxSizing?: "border-box" | undefined;
  readonly display?: "grid" | "flex" | undefined;
  readonly gap?: number | undefined;
  readonly alignContent?: "start" | undefined;
  readonly overflowY?: "scroll" | undefined;
  readonly overflowWrap?: "anywhere" | undefined;
  readonly gridTemplateColumns?: string | undefined;
  readonly gridTemplateRows?: string | undefined;
  readonly whiteSpace?: "pre-wrap" | undefined;
  readonly borderStyle?: "solid" | undefined;
  readonly borderColor?: string | undefined;
  readonly fontFamily?: "monospace" | string | undefined;
  readonly fontWeight?: "bold" | "normal" | undefined;
  readonly gridColumn?: string | undefined;
  readonly gridRow?: string | undefined;
  readonly justifySelf?: "end" | undefined;
  readonly alignSelf?: "end" | undefined;
  readonly minHeight?: number | undefined;
  readonly alignItems?: "center" | undefined;
  readonly paddingLeft?: number | undefined;
  readonly textDecoration?: string | undefined;
  readonly stroke?: string | undefined;
  readonly flexGrow?: "1" | undefined;
};

const stylePropertyNameCamelCaseToKebabCaseMap: ReadonlyMap<string, string> =
  new Map<keyof Style, string>([
    ["textAlign", "text-align"],
    ["fontSize", "font-size"],
    ["lineHeight", "line-height"],
    ["backgroundColor", "background-color"],
    ["borderRadius", "border-radius"],
    ["boxSizing", "box-sizing"],
    ["alignContent", "align-content"],
    ["overflowY", "overflow-y"],
    ["overflowWrap", "overflow-wrap"],
    ["gridTemplateColumns", "grid-template-columns"],
    ["gridTemplateRows", "grid-template-rows"],
    ["whiteSpace", "white-space"],
    ["borderStyle", "border-style"],
    ["borderColor", "border-color"],
    ["fontFamily", "font-family"],
    ["fontWeight", "font-weight"],
    ["gridColumn", "grid-column"],
    ["gridRow", "grid-row"],
    ["justifySelf", "justify-self"],
    ["alignSelf", "align-self"],
    ["minHeight", "min-height"],
    ["alignItems", "align-items"],
    ["paddingLeft", "padding-left"],
    ["textDecoration", "text-decoration"],
    ["flexGrow", "flex-grow"],
  ]);

export type StateStyle = {
  readonly hover: Style;
  readonly focus: Style;
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

export const getRenderedCss = (): string => {
  return [...insertedStyle.entries()].map(([hash, styleAndState]): string => {
    return styleAndStateStyleToCssString(
      hashToClassName(hash),
      styleAndState.style,
      styleAndState.state,
    );
  }).join("\n");
};

/**
 * すでに追加したスタイルの辞書. キーはハッシュ値
 *
 * SSRのために, スタイル本体まで保持している
 */
const insertedStyle = new Map<
  string,
  { readonly style: Style; readonly state: StateStyle }
>();

const hashToClassName = (hash: string): string => "d_" + hash;

/**
 * スタイルのハッシュ値を計算する. c に渡すことによって `className` を得ることができる
 *
 * コンポーネントの外で使うとパフォーマンスが良くなるが, 動的な場合は中で使うことができる
 *
 * @pure
 */
export const toStyleAndHash = (
  style: Style,
  state?: Partial<StateStyle>,
): StyleAndHash => {
  const stateStyle: StateStyle = {
    hover: state?.hover ?? {},
    disabled: state?.disabled ?? {},
    focus: state?.focus ?? {},
  };
  const hash = hashStyle(style, stateStyle);
  return {
    style,
    stateStyle,
    hash,
  };
};

/**
 * {@link toStyleAndHash} で生成した {@link StyleAndHash} からクラス名を生成する
 *
 * Deno で esbuild でバンドルしたときに styled-component, emotion など動かなかっため自作した
 */
export const c = (styleAndHash: StyleAndHash): string => {
  const className = hashToClassName(styleAndHash.hash);
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
    styleAndHash.stateStyle,
  );
  console.log(cssString);
  const styleElement = document.getElementById(definyCssInJsId);
  if (styleElement instanceof HTMLStyleElement) {
    styleElement.append(cssString);
    return className;
  }
  const createdStyleElement = document.createElement("style");
  createdStyleElement.id = definyCssInJsId;
  document.head.appendChild(createdStyleElement);
  createdStyleElement.textContent = cssString;
  return className;
};

const hashStyle = (style: Style, state: StateStyle): string => {
  return murmurHash3(styleAndStateStyleToCssString("", style, state)).toString(
    16,
  );
};

const styleAndStateStyleToCssString = (
  className: string,
  style: Style,
  stateStyle: StateStyle,
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

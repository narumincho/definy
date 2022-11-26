import { murmurHash3 } from "https://deno.land/x/murmur_hash_3@1.0.0/mod.ts";
import React from "https://esm.sh/react@18.2.0?pin=v99";

/**
 * 自作の CSS in JS
 * Deno で esbuild でバンドルしたときに styled-component, emotion など動かなかっため自作した
 */

export type StyleMap = ReadonlyMap<
  string,
  { readonly style: Style; readonly state: StateStyle }
>;

const CssContext = React.createContext<
  (styleAndHash: StyleAndHash) => string
>(() => "...");

export const useCssInJs = () => React.useContext(CssContext);

export const CssProvider = (
  props: { readonly children: React.ReactElement },
) => {
  const [insertedStyle, setInsertedStyle] = React.useState<StyleMap>(new Map());

  console.log("CssProvider.build", insertedStyle.size);

  const c = React.useCallback((styleAndHash: StyleAndHash): string => {
    const className = hashToClassName(styleAndHash.hash);
    if (insertedStyle.has(styleAndHash.hash)) {
      return className;
    }
    setInsertedStyle((old) => {
      const newMap = new Map(old);
      newMap.set(styleAndHash.hash, {
        style: styleAndHash.style,
        state: styleAndHash.stateStyle,
      });
      return newMap;
    });
    return className;
  }, [insertedStyle]);

  return (
    <CssContext.Provider value={c}>
      <style>
        {[...insertedStyle].map(([k, v]) => {
          return styleAndStateStyleToCssString(
            hashToClassName(k),
            v.style,
            v.state,
          );
        })}
      </style>
      {props.children}
    </CssContext.Provider>
  );
};

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
  readonly alignContent?: "start" | "end" | undefined;
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
  readonly backdropFilter?: string;
  readonly zIndex?: string;
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
    ["backdropFilter", "backdrop-filter"],
    ["zIndex", "z-index"],
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

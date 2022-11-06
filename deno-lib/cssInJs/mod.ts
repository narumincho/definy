/// <reference lib="dom" />
import { murmurHash3 } from "https://deno.land/x/murmur_hash_3@1.0.0/mod.ts";

const definyCssInJsId = "definy-css-in-js";

export type Style = {
  readonly cursor?: "pointer" | "not-allowed" | undefined;
  readonly border?: "none" | undefined;
  readonly padding?: number | undefined;
  readonly "text-align"?: "left" | undefined;
  readonly "font-size"?: number | undefined;
  readonly "background-color"?: string | undefined;
  readonly color?: string | undefined;
  readonly "border-radius"?: number | undefined;
};

export type StateStyle = {
  readonly hover: Style;
  readonly disabled: Style;
};

const insertedStyle = new Map<string, Style>();

/**
 * CSS からクラス名を生成する
 *
 * Deno で esbuild でバンドルしたときに styled-component, emotion など動かなかっため自作した
 */
export const css = (style: Style, state?: Partial<StateStyle>): string => {
  const stateStyle: StateStyle = {
    hover: state?.hover ?? {},
    disabled: state?.disabled ?? {},
  };
  const hash = hashStyle(style, stateStyle);
  const className = "d_" + hash;
  if (insertedStyle.has(hash)) {
    return className;
  }
  insertedStyle.set(hash, style);
  if (globalThis.document === undefined) {
    return className;
  }
  const cssString = styleAndStateStyleToCssString(className, style, stateStyle);
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
      .map(
        ([k, v]) =>
          k + ":" + (typeof v === "number" && v !== 0 ? v + "px" : v) + ";"
      )
      .join("\n") +
    "\n}"
  );
};

import { HtmlElement, htmlElement, htmlElementNoEndTag } from "./data";

/** 多くのHTMLElementに指定できる属性 */
export type CommonAttributes = {
  id?: string;
  class?: string;
};

const commonAttributesToMap = (
  attributes: CommonAttributes
): ReadonlyMap<string, string | null> => {
  const attributeMap: Map<string, string | null> = new Map();
  if (attributes.id !== undefined) {
    attributeMap.set("id", attributes.id);
  }
  if (attributes.class !== undefined) {
    attributeMap.set("class", attributes.class);
  }
  return attributeMap;
};

/**
 * ページの見出し
 * ```html
 * <h1></h1>
 * ```
 */
export const h1 = (
  attributes: CommonAttributes,
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement =>
  htmlElement("h1", commonAttributesToMap(attributes), children);

/**
 * 見出し
 * ```html
 * <h2></h2>
 * ```
 */
export const h2 = (
  attributes: CommonAttributes,
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement =>
  htmlElement("h2", commonAttributesToMap(attributes), children);

/**
 * 見出し
 * ```html
 * <h3></h3>
 * ```
 */
export const h3 = (
  attributes: CommonAttributes,
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement =>
  htmlElement("h3", commonAttributesToMap(attributes), children);

/**
 * ```html
 * <div></div>
 * ```
 */
export const div = (
  attributes: CommonAttributes,
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement =>
  htmlElement("div", commonAttributesToMap(attributes), children);

/**
 * ```html
 * <a href={attributes.url}></a>
 * ```
 */
export const anchor = (
  attributes: CommonAttributes & {
    url: URL;
  },
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement =>
  htmlElement(
    "a",
    new Map([
      ...commonAttributesToMap(attributes),
      ["href", attributes.url.toString()],
    ]),
    children
  );

/**
 * ```html
 * <img alt={attributes.alt} src={attributes.src}>
 * ```
 */
export const image = (
  attributes: CommonAttributes & {
    /** 画像のテキストによる説明 */
    alt: string;
    /** 画像のURL. */
    src: URL;
  }
): HtmlElement =>
  htmlElementNoEndTag(
    "img",
    new Map([
      ...commonAttributesToMap(attributes),
      ["alt", attributes.alt],
      ["src", attributes.src.toString()],
    ])
  );

/**
 * ```html
 * <svg></svg>
 * ```
 */
export const svg = (
  attributes: CommonAttributes & {
    viewBox: { x: number; y: number; width: number; height: number };
  },
  children: ReadonlyArray<HtmlElement>
): HtmlElement =>
  htmlElement(
    "svg",
    new Map([
      ...commonAttributesToMap(attributes),
      [
        "viewBox",
        [
          attributes.viewBox.x,
          attributes.viewBox.y,
          attributes.viewBox.width,
          attributes.viewBox.height,
        ].join(" "),
      ],
    ]),
    children
  );

/**
 * ```html
 * <path />
 * ```
 */
export const path = (
  attributes: CommonAttributes & {
    d: string;
    fill: string;
  }
): HtmlElement =>
  htmlElement(
    "path",
    new Map([
      ...commonAttributesToMap(attributes),
      ["d", attributes.d],
      ["fill", attributes.fill],
    ]),
    ""
  );

/** SVGの要素のアニメーションを指定する. 繰り返す回数は無限回と指定している */
type SvgAnimation = {
  attributeName: "cy" | "r" | "stroke";
  /** 時間 */
  dur: number;
  /** 開始時の値 */
  from: number | string;
  /** 終了時の値 */
  to: number | string;
};

/**
 * ```html
 * <circle><circle>
 * ```
 */
export const circle = (
  attributes: CommonAttributes & {
    cx: number;
    cy: number;
    fill: string;
    r: number;
    stroke: string;
    animations?: ReadonlyArray<SvgAnimation>;
  }
): HtmlElement => {
  return htmlElement(
    "circle",
    new Map([
      ...commonAttributesToMap(attributes),
      ["cx", attributes.cx.toString()],
      ["cy", attributes.cy.toString()],
      ["fill", attributes.fill],
      ["r", attributes.r.toString()],
      ["stroke", attributes.stroke],
    ]),
    attributes.animations === undefined
      ? ""
      : attributes.animations.map(animate)
  );
};

/**
 * ```html
 * <animate />
 * ```
 */
const animate = (svgAnimation: SvgAnimation): HtmlElement =>
  htmlElement(
    "animate",
    new Map([
      ["attributeName", svgAnimation.attributeName],
      ["dur", svgAnimation.dur.toString()],
      ["from", svgAnimation.from.toString()],
      ["repeatCount", "indefinite"],
      ["to", svgAnimation.to.toString()],
    ]),
    ""
  );

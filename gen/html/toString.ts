import {
  Color,
  HtmlElement,
  Language,
  TwitterCard,
  htmlElement,
  htmlElementNoEndTag,
  htmlElementRawText,
  htmlOption,
} from "./data";

export const escapeInHtml = (text: string): string =>
  text
    .replace(/&/gu, "&amp;")
    .replace(/>/gu, "&gt;")
    .replace(/</gu, "&lt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#x27;")
    .replace(/`/gu, "&#x60;");

const languageToIETFLanguageTag = (language: Language): string => {
  switch (language) {
    case "Japanese":
      return "ja";
    case "English":
      return "en";
    case "Esperanto":
      return "eo";
  }
};

const twitterCardToString = (twitterCard: TwitterCard): string => {
  switch (twitterCard) {
    case "SummaryCard":
      return "summary";
    case "SummaryCardWithLargeImage":
      return "summary_large_image";
  }
};

/**
 * View を HTML に変換する. イベントの登録は行われない
 */
export const htmlOptionToString = (option: htmlOption): string =>
  "<!doctype html>" +
  htmlElementToString(
    htmlElement(
      "html",
      new Map(
        option.language === undefined
          ? []
          : [["lang", languageToIETFLanguageTag(option.language)]]
      ),
      [
        headElement(option),
        htmlElement(
          "body",
          option.bodyClass === undefined
            ? new Map()
            : new Map([["class", option.bodyClass]]),
          [
            htmlElement(
              "noscript",
              new Map(),
              option.appName +
                " では JavaScript を使用します. ブラウザの設定で有効にしてください."
            ),
            ...option.children,
          ]
        ),
      ]
    )
  );

const headElement = (view: htmlOption): HtmlElement => {
  const children: Array<HtmlElement> = [
    charsetElement,
    viewportElement,
    pageNameElement(view.pageName),
    descriptionElement(view.description),
  ];
  if (view.themeColor !== undefined) {
    children.push(themeColorElement(view.themeColor));
  }
  children.push(iconElement(view.iconUrl));
  if (view.webAppManifestUrl !== undefined) {
    children.push(webAppManifestElement(view.webAppManifestUrl));
  }
  if (typeof view.style === "string") {
    children.push(cssStyleElement(view.style));
  }
  children.push(twitterCardElement(view.twitterCard));
  children.push(ogUrlElement(view.url));
  children.push(ogTitleElement(view.pageName));
  children.push(ogSiteName(view.appName));
  children.push(ogDescription(view.description));
  children.push(ogImage(view.coverImageUrl));
  if (typeof view.script === "string") {
    children.push(javaScriptElement(view.script));
  }
  if (view.scriptUrlList !== undefined) {
    for (const scriptUrl of view.scriptUrlList) {
      children.push(javaScriptElementByUrl(scriptUrl));
    }
  }
  if (view.styleUrlList !== undefined) {
    for (const styleUrl of view.styleUrlList) {
      children.push(styleElementByUrl(styleUrl));
    }
  }

  return htmlElement("head", new Map(), children);
};

const charsetElement: HtmlElement = htmlElementNoEndTag(
  "meta",
  new Map([["charset", "utf-8"]])
);

const viewportElement: HtmlElement = htmlElementNoEndTag(
  "meta",
  new Map([
    ["name", "viewport"],
    ["content", "width=device-width,initial-scale=1.0"],
  ])
);

const pageNameElement = (pageName: string): HtmlElement =>
  htmlElement("title", new Map(), pageName);

const descriptionElement = (description: string): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["name", "description"],
      ["content", description],
    ])
  );

const themeColorElement = (themeColor: Color): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["name", "theme-color"],
      ["content", colorToHexString(themeColor)],
    ])
  );

/**
 * 色を色コードに変換する
 * ```ts
 * { r: 1, g: 1, b: 1 }
 * ```
 * ↓
 * ```ts
 * "#ffffff"
 * ```
 */
export const colorToHexString = (color: Color): string =>
  "#" +
  numberTo1byteString(color.r) +
  numberTo1byteString(color.g) +
  numberTo1byteString(color.b);

/**
 * 0...1 を 00...ff に変換する
 */
const numberTo1byteString = (value: number): string =>
  Math.max(Math.min(Math.floor(value * 256), 255), 0)
    .toString(16)
    .padStart(2, "0");

const iconElement = (iconUrl: URL): HtmlElement =>
  htmlElementNoEndTag(
    "link",
    new Map([
      ["rel", "icon"],
      ["href", iconUrl.toString()],
    ])
  );

const webAppManifestElement = (url: URL): HtmlElement =>
  htmlElementNoEndTag(
    "link",
    new Map([
      ["rel", "manifest"],
      ["href", url.toString()],
    ])
  );

const cssStyleElement = (cssCode: string): HtmlElement =>
  htmlElementRawText("style", new Map(), cssCode);

const twitterCardElement = (twitterCard: TwitterCard): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["name", "twitter:card"],
      ["content", twitterCardToString(twitterCard)],
    ])
  );

const ogUrlElement = (url: URL): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["property", "og:url"],
      ["content", url.toString()],
    ])
  );

const ogTitleElement = (title: string): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["property", "og:title"],
      ["content", title],
    ])
  );

const ogSiteName = (siteName: string): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["property", "og:site_name"],
      ["content", siteName],
    ])
  );

const ogDescription = (description: string): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["property", "og:description"],
      ["content", description],
    ])
  );

const ogImage = (url: URL): HtmlElement =>
  htmlElementNoEndTag(
    "meta",
    new Map([
      ["property", "og:image"],
      ["content", url.toString()],
    ])
  );

const javaScriptElement = (javaScriptCode: string): HtmlElement =>
  htmlElementRawText("script", new Map([["type", "module"]]), javaScriptCode);

const javaScriptElementByUrl = (url: URL): HtmlElement =>
  htmlElement(
    "script",
    new Map([
      ["defer", null],
      ["src", url.toString()],
    ]),
    []
  );

const styleElementByUrl = (url: URL): HtmlElement =>
  htmlElementNoEndTag(
    "link",
    new Map([
      ["rel", "stylesheet"],
      ["href", url.toString()],
    ])
  );

const htmlElementToString = (element: HtmlElement): string => {
  const startTag =
    "<" + element.name + attributesToString(element.attributes) + ">";
  const endTag = "</" + element.name + ">";
  switch (element.children.tag) {
    case "elementList":
      return (
        startTag +
        element.children.value.map(htmlElementToString).join("") +
        endTag
      );
    case "text":
      return startTag + escapeInHtml(element.children.text) + endTag;
    case "rawText":
      return startTag + element.children.text + endTag;
    case "noEndTag":
      return startTag;
  }
};

const attributesToString = (
  attributeMap: ReadonlyMap<string, string | null>
): string => {
  if (attributeMap.size === 0) {
    return "";
  }
  return (
    " " +
    [...attributeMap.entries()]
      .map(([key, value]): string =>
        value === null ? key : key + '="' + escapeInHtml(value) + '"'
      )
      .join(" ")
  );
};

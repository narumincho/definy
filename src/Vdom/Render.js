/// @ts-check

/**
 *
 * @param {string} newPageName
 * @returns
 */
exports.changePageName = (newPageName) => () => {
  window.document.title = newPageName;
};

const themeColorName = "theme-color";

/**
 *
 * @returns {HTMLMetaElement}
 */
const getOrCreateThemeColorMetaElement = () => {
  const themeColorMetaElement = window.document
    .getElementsByTagName("meta")
    .namedItem("theme-color");
  if (themeColorMetaElement !== undefined) {
    return themeColorMetaElement;
  }
  const newMetaElement = document.createElement("meta");
  document.head.appendChild(newMetaElement);
  newMetaElement.name = themeColorName;
  return newMetaElement;
};

/**
 *
 * @param {string} newThemeColor
 * @returns
 */
exports.changeThemeColor = (newThemeColor) => () => {
  const themeColorMetaElement = getOrCreateThemeColorMetaElement();
  themeColorMetaElement.content = newThemeColor;
};

/**
 *
 * @param {string | null} newLanguage
 * @returns
 */
exports.changeLanguage = (newLanguage) => () => {
  if (typeof newLanguage === "string") {
    document.documentElement.lang = newLanguage;
    return;
  }
  document.documentElement.removeAttribute("lang");
};

/**
 *
 * @param {string | null} classNameOrEmpty
 * @returns
 */
exports.changeBodyClass = (classNameOrEmpty) => () => {
  if (classNameOrEmpty === null) {
    document.body.removeAttribute("class");
    return;
  }
  document.body.className = classNameOrEmpty;
};

exports.getBodyElement = () => {
  return document.body;
};

/**
 * @param {string} text
 * @returns {(htmlOrSvgElement: HTMLElement | SVGElement) => () => void}
 */
exports.setTextContent = (text) => (htmlOrSvgElement) => () => {
  htmlOrSvgElement.textContent = text;
};

/**
 *
 * @param {{id: string | null, class: string | null}} option
 * @returns
 */
exports.createDiv = (option) => () => {
  const div = window.document.createElement("div");
  if (typeof option.id === "string") {
    div.id = option.id;
  }
  if (typeof option.class === "string") {
    div.className = option.class;
  }
  return div;
};

/**
 *
 * @param {{id: string | null, class: string | null}} option
 * @returns
 */
exports.createH1 = (option) => () => {
  const headingElement = window.document.createElement("h1");
  if (typeof option.id === "string") {
    headingElement.id = option.id;
  }
  if (typeof option.class === "string") {
    headingElement.className = option.class;
  }
  return headingElement;
};

/**
 *
 * @param {{id: string | null, class: string | null}} option
 * @returns
 */
exports.createH2 = (option) => () => {
  const headingElement = window.document.createElement("h2");
  if (typeof option.id === "string") {
    headingElement.id = option.id;
  }
  if (typeof option.class === "string") {
    headingElement.className = option.class;
  }
  return headingElement;
};

/**
 *
 * @param {{id: string | null, class: string | null, href : string}} option
 * @returns
 */
exports.createA = (option) => () => {
  const anchorElement = window.document.createElement("a");
  if (typeof option.id === "string") {
    anchorElement.id = option.id;
  }
  if (typeof option.class === "string") {
    anchorElement.className = option.class;
  }
  anchorElement.href = option.href;
  return anchorElement;
};

/**
 *
 * @param {{id: string | null, class: string | null}} option
 * @returns
 */
exports.createButton = (option) => () => {
  const button = window.document.createElement("button");
  if (typeof option.id === "string") {
    button.id = option.id;
  }
  if (typeof option.class === "string") {
    button.className = option.class;
  }
  button.type = "button";
  return button;
};

/**
 *
 * @param {{id: string | null, class: string | null, alt : string, src : string}} option
 * @returns
 */
exports.createImg = (option) => () => {
  const image = window.document.createElement("img");
  if (typeof option.id === "string") {
    image.id = option.id;
  }
  if (typeof option.class === "string") {
    image.className = option.class;
  }
  image.alt = option.alt;
  image.src = option.src;
  return image;
};

/**
 *
 * @param {{id: string | null, class: string | null, checked : boolean, name :string}} option
 * @returns
 */
exports.createInputRadio = (option) => () => {
  const input = window.document.createElement("input");
  input.type = "radio";
  if (typeof option.id === "string") {
    input.id = option.id;
  }
  if (typeof option.class === "string") {
    input.className = option.class;
  }
  input.checked = option.checked;
  input.name = option.name;
  return input;
};

/**
 *
 * @param {HTMLElement | SVGElement} parent
 * @returns {(child: HTMLElement | SVGElement) => () => void}
 */
exports.appendChild = (parent) => (child) => () => {
  parent.appendChild(child);
};

/**
 *
 * @param {HTMLElement | SVGElement} element
 * @returns {(path: string) => () => void}
 */
exports.setDataPath = (element) => (path) => () => {
  element.dataset.dPath = path;
};

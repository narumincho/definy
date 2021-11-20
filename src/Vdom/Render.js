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
 * @param {string | null} newThemeColor
 * @returns
 */
exports.changeThemeColor = (newThemeColor) => () => {
  const themeColorMetaElement = getOrCreateThemeColorMetaElement();
  if (newThemeColor === null) {
    themeColorMetaElement.remove();
  } else {
    themeColorMetaElement.content = newThemeColor;
  }
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
 * @param {string} classNameOrEmpty
 * @returns
 */
exports.changeBodyClass = (classNameOrEmpty) => () => {
  if (classNameOrEmpty === "") {
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
 * @param {{id: string, class: string, dataPath: string}} option
 * @returns
 */
exports.createDiv = (option) => () => {
  const div = window.document.createElement("div");
  if (option.id !== "") {
    div.id = option.id;
  }
  if (option.class !== "") {
    div.className = option.class;
  }
  div.dataset.dPath = option.dataPath;
  return div;
};

/**
 *
 * @param {HTMLElement | SVGElement} parent
 * @returns {(child: HTMLElement | SVGElement) => () => void}
 */
exports.appendChild = (parent) => (child) => () => {
  parent.appendChild(child);
};

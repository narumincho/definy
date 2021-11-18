/// @ts-check

/**
 *
 * @param {{id: string, class: string}} option
 * @returns
 */
exports.createDiv = (option) => () => {
  const div = window.document.createElement("div");
  if (option.id !== "") {
    div.id = option.id;
  }
  div.className = option.class;
  return div;
};

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

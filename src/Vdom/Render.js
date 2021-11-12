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

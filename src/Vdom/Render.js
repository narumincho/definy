/// @ts-check

/**
 *
 * @param {string} newPageName
 * @returns
 */
exports.changePageName = (newPageName) => {
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
 */
exports.changeThemeColor = (newThemeColor) => {
  const themeColorMetaElement = getOrCreateThemeColorMetaElement();
  themeColorMetaElement.content = newThemeColor;
};

/**
 *
 * @param {string | null} newLanguage
 */
exports.changeLanguage = (newLanguage) => {
  if (typeof newLanguage === "string") {
    document.documentElement.lang = newLanguage;
    return;
  }
  document.documentElement.removeAttribute("lang");
};

/**
 *
 * @param {string | null} classNameOrEmpty
 */
exports.changeBodyClass = (classNameOrEmpty) => {
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
 *
 * @param {string} text
 * @param {HTMLElement | SVGElement} htmlOrSvgElement
 */
exports.setTextContent = (text, htmlOrSvgElement) => {
  htmlOrSvgElement.textContent = text;
};

/**
 *
 * @param {{id: string | null, class: string | null}} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createDiv = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createH1 = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createH2 = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createA = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createButton = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createImg = (option) => {
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
 * @returns {HTMLElement | SVGElement}
 */
exports.createInputRadio = (option) => {
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
 * @param {{id : string | null, class: string | null, readonly : boolean, value : string}} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createInputText = (option) => {
  const input = window.document.createElement("input");
  input.type = "text";
  if (typeof option.id === "string") {
    input.id = option.id;
  }
  if (typeof option.class === "string") {
    input.className = option.class;
  }
  input.readOnly = option.readonly;
  input.value = option.value;
  return input;
};

/**
 *
 * @param {{id : string | null, class: string | null, readonly : boolean, value : string}} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createTextArea = (option) => {
  const input = window.document.createElement("textarea");
  if (typeof option.id === "string") {
    input.id = option.id;
  }
  if (typeof option.class === "string") {
    input.className = option.class;
  }
  input.readOnly = option.readonly;
  input.value = option.value;
  return input;
};

/**
 *
 * @param {{id : string | null, class: string | null, for : string}} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createLabel = (option) => {
  const label = window.document.createElement("label");
  if (typeof option.id === "string") {
    label.id = option.id;
  }
  if (typeof option.class === "string") {
    label.className = option.class;
  }
  label.htmlFor = option.for;
  return label;
};

/**
 *
 * @param {{id : string | null, class: string | null, viewBoxX: number, viewBoxY: number, viewBoxWidth: number, viewBoxHeight: number}} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createSvg = (option) => {
  const svg = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  if (typeof option.id === "string") {
    svg.id = option.id;
  }
  if (typeof option.class === "string") {
    svg.classList.add(option.class);
  }
  svg.viewBox.baseVal.x = option.viewBoxX;
  svg.viewBox.baseVal.y = option.viewBoxY;
  svg.viewBox.baseVal.width = option.viewBoxWidth;
  svg.viewBox.baseVal.height = option.viewBoxHeight;
  return svg;
};

/**
 *
 * @param {{id : string | null, class: string | null, d: string, fill: string }} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createSvgPath = (option) => {
  const svgPath = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  if (typeof option.id === "string") {
    svgPath.id = option.id;
  }
  if (typeof option.class === "string") {
    svgPath.classList.add(option.class);
  }
  svgPath.setAttribute("d", option.d);
  svgPath.setAttribute("fill", option.fill);
  return svgPath;
};

/**
 *
 * @param {{id : string | null, class: string | null, fill: string, stroke: string, cx: number, cy: number, r: number }} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createSvgCircle = (option) => {
  const svgCircle = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  if (typeof option.id === "string") {
    svgCircle.id = option.id;
  }
  if (typeof option.class === "string") {
    svgCircle.classList.add(option.class);
  }
  svgCircle.setAttribute("fill", option.fill);
  svgCircle.setAttribute("stroke", option.stroke);
  svgCircle.cx.baseVal.value = option.cx;
  svgCircle.cy.baseVal.value = option.cy;
  svgCircle.r.baseVal.value = option.r;
  return svgCircle;
};

/**
 *
 * @param {{ attributeName: string, dur: number, repeatCount: string, from: string, to: string }} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createSvgAnimate = (option) => {
  const svgAnimate = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "animate"
  );
  svgAnimate.setAttribute("attributeName", option.attributeName);
  svgAnimate.setAttribute("dur", option.dur.toString());
  svgAnimate.setAttribute("repeatCount", option.repeatCount);
  svgAnimate.setAttribute("from", option.from);
  svgAnimate.setAttribute("to", option.to);
  return svgAnimate;
};

/**
 *
 * @param {{ id : string | null, class: string | null, transform: string }} option
 * @returns {HTMLElement | SVGElement}
 */
exports.createSvgG = (option) => {
  const svgG = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );
  if (typeof option.id === "string") {
    svgG.id = option.id;
  }
  if (typeof option.class === "string") {
    svgG.classList.add(option.class);
  }
  svgG.setAttribute("transform", option.transform);
  return svgG;
};

/**
 *
 * @param {HTMLElement | SVGElement} parent
 * @param {HTMLElement | SVGElement} child
 */
exports.appendChild = (parent, child) => {
  parent.appendChild(child);
};

/**
 *
 * @param {HTMLElement | SVGElement} element
 * @param {string} path
 */
exports.setDataPath = (element, path) => {
  element.dataset.dPath = path;
};

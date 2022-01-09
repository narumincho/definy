export const changePageName = (newPageName: string): void => {
  window.document.title = newPageName;
};

const themeColorName = "theme-color";

export const changeThemeColor = (newThemeColor: string | null): void => {
  const themeColorMetaElement = window.document
    .getElementsByTagName("meta")
    .namedItem("theme-color");
  if (themeColorMetaElement !== null) {
    if (typeof newThemeColor === "string") {
      themeColorMetaElement.content = newThemeColor;
      return;
    }
    themeColorMetaElement.remove();
    return;
  }
  if (newThemeColor === null) {
    return;
  }
  const newMetaElement = document.createElement("meta");
  document.head.appendChild(newMetaElement);
  newMetaElement.name = themeColorName;
  newMetaElement.content = newThemeColor;
};

export const changeLanguage = (newLanguage: string | null): void => {
  if (typeof newLanguage === "string") {
    document.documentElement.lang = newLanguage;
    return;
  }
  document.documentElement.removeAttribute("lang");
};

export const changeBodyClass = (classNameOrEmpty: string | null) => {
  if (classNameOrEmpty === null) {
    document.body.removeAttribute("class");
    return;
  }
  document.body.className = classNameOrEmpty;
};

export const getBodyElement = () => {
  return document.body;
};

export const setTextContent = (
  text: string,
  htmlOrSvgElement: HTMLElement | SVGElement
) => {
  htmlOrSvgElement.textContent = text;
};

export const createDiv = (option: {
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const div = window.document.createElement("div");
  div.addEventListener("click", (e) => option.click(e));
  return div;
};

export const createSpan = (option: {
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const span = window.document.createElement("span");
  span.addEventListener("click", (e) => option.click(e));
  return span;
};

export const createH1 = (option: {
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const headingElement = window.document.createElement("h1");
  headingElement.addEventListener("click", (e) => option.click(e));
  return headingElement;
};

export const createH2 = (option: {
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const headingElement = window.document.createElement("h2");
  headingElement.addEventListener("click", (e) => option.click(e));
  return headingElement;
};

export const createCode = (option: {
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const codeElement = window.document.createElement("code");
  codeElement.addEventListener("click", (e) => option.click(e));
  return codeElement;
};

export const createSameOriginAnchor = (option: {
  readonly href: string;
  readonly click: (mouseEvent: MouseEvent) => void;
}): HTMLElement | SVGElement => {
  const anchorElement = window.document.createElement("a");
  anchorElement.href = option.href;
  anchorElement.addEventListener("click", (mouseEvent) => {
    /*
     * リンクを
     * Ctrlなどを押しながらクリックか,
     * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ブラウザでページ推移をしない.
     */
    if (
      mouseEvent.ctrlKey ||
      mouseEvent.metaKey ||
      mouseEvent.shiftKey ||
      mouseEvent.button !== 0
    ) {
      return;
    }
    mouseEvent.preventDefault();
    option.click(mouseEvent);
  });
  return anchorElement;
};

export const createExternalAnchor = (option: {
  readonly href: string;
}): HTMLElement | SVGElement => {
  const anchorElement = window.document.createElement("a");
  anchorElement.href = option.href;
  return anchorElement;
};

export const createButton = (): HTMLElement | SVGElement => {
  const button = window.document.createElement("button");
  button.type = "button";
  return button;
};

export const createImg = (option: {
  readonly alt: string;
  readonly src: string;
}): HTMLElement | SVGElement => {
  const image = window.document.createElement("img");
  image.alt = option.alt;
  image.src = option.src;
  return image;
};

export const createInputRadio = (option: {
  readonly checked: boolean;
  readonly name: string;
}): HTMLElement | SVGElement => {
  const input = window.document.createElement("input");
  input.type = "radio";
  input.checked = option.checked;
  input.name = option.name;
  return input;
};

export const createInputText = (option: {
  readonly readonly: boolean;
  readonly value: string;
}): HTMLElement | SVGElement => {
  const input = window.document.createElement("input");
  input.type = "text";
  input.readOnly = option.readonly;
  input.value = option.value;
  return input;
};

export const createTextArea = (option: {
  readonly readonly: boolean;
  readonly value: string;
}): HTMLElement | SVGElement => {
  const input = window.document.createElement("textarea");
  input.readOnly = option.readonly;
  input.value = option.value;
  return input;
};

export const createLabel = (option: {
  readonly for: string;
}): HTMLElement | SVGElement => {
  const label = window.document.createElement("label");
  label.htmlFor = option.for;
  return label;
};

const svgNamespaceUri = "http://www.w3.org/2000/svg";

export const createSvg = (option: {
  readonly viewBox: string;
}): HTMLElement | SVGElement => {
  const svg = window.document.createElementNS(svgNamespaceUri, "svg");
  svg.setAttribute("viewBox", option.viewBox);
  return svg;
};

export const createSvgPath = (option: {
  readonly d: string;
  readonly fill: string;
}): HTMLElement | SVGElement => {
  const svgPath = window.document.createElementNS(svgNamespaceUri, "path");
  svgPath.setAttribute("d", option.d);
  svgPath.setAttribute("fill", option.fill);
  return svgPath;
};

export const createSvgCircle = (option: {
  readonly fill: string;
  readonly stroke: string | null;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}): HTMLElement | SVGElement => {
  const svgCircle = window.document.createElementNS(svgNamespaceUri, "circle");
  svgCircle.setAttribute("fill", option.fill);
  if (typeof option.stroke === "string") {
    svgCircle.setAttribute("stroke", option.stroke);
  }
  svgCircle.cx.baseVal.value = option.cx;
  svgCircle.cy.baseVal.value = option.cy;
  svgCircle.r.baseVal.value = option.r;
  return svgCircle;
};

export const createSvgAnimate = (option: {
  readonly attributeName: string;
  readonly dur: number;
  readonly repeatCount: string;
  readonly from: string;
  readonly to: string;
}): HTMLElement | SVGElement => {
  const svgAnimate = window.document.createElementNS(
    svgNamespaceUri,
    "animate"
  );
  svgAnimate.setAttribute("attributeName", option.attributeName);
  svgAnimate.setAttribute("dur", option.dur.toString());
  svgAnimate.setAttribute("repeatCount", option.repeatCount);
  svgAnimate.setAttribute("from", option.from);
  svgAnimate.setAttribute("to", option.to);
  return svgAnimate;
};

export const createSvgG = (option: {
  readonly transform: string;
}): HTMLElement | SVGElement => {
  const svgG = window.document.createElementNS(svgNamespaceUri, "g");
  svgG.setAttribute("transform", option.transform);
  return svgG;
};

export const createSvgPolygon = (option: {
  readonly points: string;
  readonly stroke: string;
  readonly fill: string;
}): HTMLElement | SVGElement => {
  const svgPolygon = window.document.createElementNS(
    svgNamespaceUri,
    "polygon"
  );
  /*
   * https://developer.mozilla.org/en-US/docs/Web/API/SVGPointList/appendItem
   * appendItem のパラメータとして使う SVGPoint が非推奨になっているため. setAttribute を使う
   */
  svgPolygon.setAttribute("points", option.points);
  svgPolygon.setAttribute("stroke", option.stroke);
  svgPolygon.setAttribute("fill", option.fill);
  return svgPolygon;
};

export const createSvgEllipse = (option: {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}): HTMLElement | SVGElement => {
  const svgEllipse = window.document.createElementNS(
    svgNamespaceUri,
    "ellipse"
  );
  svgEllipse.cx.baseVal.value = option.cx;
  svgEllipse.cy.baseVal.value = option.cy;
  svgEllipse.rx.baseVal.value = option.rx;
  svgEllipse.ry.baseVal.value = option.ry;
  svgEllipse.setAttribute("fill", option.fill);
  return svgEllipse;
};

export const createSvgText = (option: {
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fill: string;
  readonly text: string;
}): HTMLElement | SVGElement => {
  const svgText = window.document.createElementNS(svgNamespaceUri, "text");
  svgText.setAttribute("text-anchor", "middle");
  svgText.setAttribute("x", option.x.toString());
  svgText.setAttribute("y", option.y.toString());
  svgText.setAttribute("font-size", option.fontSize.toString());
  svgText.setAttribute("fill", option.fill);
  svgText.textContent = option.text;
  return svgText;
};

export const appendChild = (
  parent: HTMLElement | SVGElement,
  child: HTMLElement | SVGElement
): void => {
  parent.appendChild(child);
};

export const setDataPath = (
  element: HTMLElement | SVGElement,
  path: string
): void => {
  element.dataset.dPath = path;
};

export const setId = (element: HTMLElement | SVGElement, id: string) => {
  element.id = id;
};

export const setClass = (
  element: HTMLElement | SVGElement,
  className: string
) => {
  element.classList.add(className);
};

const getStyleElement = (): HTMLStyleElement => {
  const styleElement = document.getElementsByTagName("style")[0];
  if (styleElement === undefined) {
    const createdStyleElement = document.createElement("style");
    document.head.appendChild(createdStyleElement);
    return createdStyleElement;
  }
  return styleElement;
};

export const setStyle = (styleString: string) => {
  getStyleElement().textContent = styleString;
};

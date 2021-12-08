export const changePageName = (newPageName: string): void => {
  window.document.title = newPageName;
};

const themeColorName = "theme-color";

const getOrCreateThemeColorMetaElement = (): HTMLMetaElement => {
  const themeColorMetaElement = window.document
    .getElementsByTagName("meta")
    .namedItem("theme-color");
  if (themeColorMetaElement !== null) {
    return themeColorMetaElement;
  }
  const newMetaElement = document.createElement("meta");
  document.head.appendChild(newMetaElement);
  newMetaElement.name = themeColorName;
  return newMetaElement;
};

export const changeThemeColor = (newThemeColor: string): void => {
  const themeColorMetaElement = getOrCreateThemeColorMetaElement();
  themeColorMetaElement.content = newThemeColor;
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
  readonly id: string | null;
  readonly class: string | null;
}): HTMLElement | SVGElement => {
  const div = window.document.createElement("div");
  if (typeof option.id === "string") {
    div.id = option.id;
  }
  if (typeof option.class === "string") {
    div.className = option.class;
  }
  return div;
};

export const createH1 = (option: {
  readonly id: string | null;
  readonly class: string | null;
}): HTMLElement | SVGElement => {
  const headingElement = window.document.createElement("h1");
  if (typeof option.id === "string") {
    headingElement.id = option.id;
  }
  if (typeof option.class === "string") {
    headingElement.className = option.class;
  }
  return headingElement;
};

export const createH2 = (option: {
  readonly id: string | null;
  readonly class: string | null;
}): HTMLElement | SVGElement => {
  const headingElement = window.document.createElement("h2");
  if (typeof option.id === "string") {
    headingElement.id = option.id;
  }
  if (typeof option.class === "string") {
    headingElement.className = option.class;
  }
  return headingElement;
};

export const createA = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly href: string;
}): HTMLElement | SVGElement => {
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

export const createButton = (option: {
  readonly id: string | null;
  readonly class: string | null;
}): HTMLElement | SVGElement => {
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

export const createImg = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly alt: string;
  readonly src: string;
}): HTMLElement | SVGElement => {
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

export const createInputRadio = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly checked: boolean;
  readonly name: string;
}): HTMLElement | SVGElement => {
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

export const createInputText = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly readonly: boolean;
  readonly value: string;
}): HTMLElement | SVGElement => {
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

export const createTextArea = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly readonly: boolean;
  readonly value: string;
}): HTMLElement | SVGElement => {
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

export const createLabel = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly for: string;
}): HTMLElement | SVGElement => {
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

export const createSvg = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly viewBoxX: number;
  readonly viewBoxY: number;
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
}): HTMLElement | SVGElement => {
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

export const createSvgPath = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly d: string;
  readonly fill: string;
}): HTMLElement | SVGElement => {
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

export const createSvgCircle = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly fill: string;
  readonly stroke: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}): HTMLElement | SVGElement => {
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

export const createSvgAnimate = (option: {
  attributeName: string;
  dur: number;
  repeatCount: string;
  from: string;
  to: string;
}): HTMLElement | SVGElement => {
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

export const createSvgG = (option: {
  readonly id: string | null;
  readonly class: string | null;
  readonly transform: string;
}): HTMLElement | SVGElement => {
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

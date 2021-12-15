"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStyle = exports.setDataPath = exports.appendChild = exports.createSvgG = exports.createSvgAnimate = exports.createSvgCircle = exports.createSvgPath = exports.createSvg = exports.createLabel = exports.createTextArea = exports.createInputText = exports.createInputRadio = exports.createImg = exports.createButton = exports.createExternalAnchor = exports.createSameOriginAnchor = exports.createCode = exports.createH2 = exports.createH1 = exports.createDiv = exports.setTextContent = exports.getBodyElement = exports.changeBodyClass = exports.changeLanguage = exports.changeThemeColor = exports.changePageName = void 0;
const changePageName = (newPageName) => {
    window.document.title = newPageName;
};
exports.changePageName = changePageName;
const themeColorName = "theme-color";
const getOrCreateThemeColorMetaElement = () => {
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
const changeThemeColor = (newThemeColor) => {
    const themeColorMetaElement = getOrCreateThemeColorMetaElement();
    themeColorMetaElement.content = newThemeColor;
};
exports.changeThemeColor = changeThemeColor;
const changeLanguage = (newLanguage) => {
    if (typeof newLanguage === "string") {
        document.documentElement.lang = newLanguage;
        return;
    }
    document.documentElement.removeAttribute("lang");
};
exports.changeLanguage = changeLanguage;
const changeBodyClass = (classNameOrEmpty) => {
    if (classNameOrEmpty === null) {
        document.body.removeAttribute("class");
        return;
    }
    document.body.className = classNameOrEmpty;
};
exports.changeBodyClass = changeBodyClass;
const getBodyElement = () => {
    return document.body;
};
exports.getBodyElement = getBodyElement;
const setTextContent = (text, htmlOrSvgElement) => {
    htmlOrSvgElement.textContent = text;
};
exports.setTextContent = setTextContent;
const createDiv = (option) => {
    const div = window.document.createElement("div");
    if (typeof option.id === "string") {
        div.id = option.id;
    }
    if (typeof option.class === "string") {
        div.className = option.class;
    }
    div.addEventListener("click", (e) => option.click(e));
    return div;
};
exports.createDiv = createDiv;
const createH1 = (option) => {
    const headingElement = window.document.createElement("h1");
    if (typeof option.id === "string") {
        headingElement.id = option.id;
    }
    if (typeof option.class === "string") {
        headingElement.className = option.class;
    }
    headingElement.addEventListener("click", (e) => option.click(e));
    return headingElement;
};
exports.createH1 = createH1;
const createH2 = (option) => {
    const headingElement = window.document.createElement("h2");
    if (typeof option.id === "string") {
        headingElement.id = option.id;
    }
    if (typeof option.class === "string") {
        headingElement.className = option.class;
    }
    headingElement.addEventListener("click", (e) => option.click(e));
    return headingElement;
};
exports.createH2 = createH2;
const createCode = (option) => {
    const codeElement = window.document.createElement("code");
    if (typeof option.id === "string") {
        codeElement.id = option.id;
    }
    if (typeof option.class === "string") {
        codeElement.className = option.class;
    }
    codeElement.addEventListener("click", (e) => option.click(e));
    return codeElement;
};
exports.createCode = createCode;
const createSameOriginAnchor = (option) => {
    const anchorElement = window.document.createElement("a");
    if (typeof option.id === "string") {
        anchorElement.id = option.id;
    }
    if (typeof option.class === "string") {
        anchorElement.className = option.class;
    }
    anchorElement.href = option.href;
    anchorElement.addEventListener("click", (mouseEvent) => {
        /*
         * リンクを
         * Ctrlなどを押しながらクリックか,
         * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ブラウザでページ推移をしない.
         */
        if (mouseEvent.ctrlKey ||
            mouseEvent.metaKey ||
            mouseEvent.shiftKey ||
            mouseEvent.button !== 0) {
            return;
        }
        mouseEvent.preventDefault();
        option.click(mouseEvent);
    });
    return anchorElement;
};
exports.createSameOriginAnchor = createSameOriginAnchor;
const createExternalAnchor = (option) => {
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
exports.createExternalAnchor = createExternalAnchor;
const createButton = (option) => {
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
exports.createButton = createButton;
const createImg = (option) => {
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
exports.createImg = createImg;
const createInputRadio = (option) => {
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
exports.createInputRadio = createInputRadio;
const createInputText = (option) => {
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
exports.createInputText = createInputText;
const createTextArea = (option) => {
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
exports.createTextArea = createTextArea;
const createLabel = (option) => {
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
exports.createLabel = createLabel;
const createSvg = (option) => {
    const svg = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
exports.createSvg = createSvg;
const createSvgPath = (option) => {
    const svgPath = window.document.createElementNS("http://www.w3.org/2000/svg", "path");
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
exports.createSvgPath = createSvgPath;
const createSvgCircle = (option) => {
    const svgCircle = window.document.createElementNS("http://www.w3.org/2000/svg", "circle");
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
exports.createSvgCircle = createSvgCircle;
const createSvgAnimate = (option) => {
    const svgAnimate = window.document.createElementNS("http://www.w3.org/2000/svg", "animate");
    svgAnimate.setAttribute("attributeName", option.attributeName);
    svgAnimate.setAttribute("dur", option.dur.toString());
    svgAnimate.setAttribute("repeatCount", option.repeatCount);
    svgAnimate.setAttribute("from", option.from);
    svgAnimate.setAttribute("to", option.to);
    return svgAnimate;
};
exports.createSvgAnimate = createSvgAnimate;
const createSvgG = (option) => {
    const svgG = window.document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (typeof option.id === "string") {
        svgG.id = option.id;
    }
    if (typeof option.class === "string") {
        svgG.classList.add(option.class);
    }
    svgG.setAttribute("transform", option.transform);
    return svgG;
};
exports.createSvgG = createSvgG;
const appendChild = (parent, child) => {
    parent.appendChild(child);
};
exports.appendChild = appendChild;
const setDataPath = (element, path) => {
    element.dataset.dPath = path;
};
exports.setDataPath = setDataPath;
const getStyleElement = () => {
    const styleElement = document.getElementsByTagName("style")[0];
    if (styleElement === undefined) {
        const createdStyleElement = document.createElement("style");
        document.head.appendChild(createdStyleElement);
        return createdStyleElement;
    }
    return styleElement;
};
const setStyle = (styleString) => {
    getStyleElement().textContent = styleString;
};
exports.setStyle = setStyle;

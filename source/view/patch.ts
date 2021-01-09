import * as d from "./data";
import * as v from "./view";

interface PatchState<Message> {
  readonly clickEventHandler: (path: string, mouseEvent: MouseEvent) => void;
  readonly changeEventHandler: (path: string, event: Event) => void;
  readonly inputEventHandler: (path: string, event: InputEvent) => void;
  readonly setMessageDataMap: (
    newMap: ReadonlyMap<v.Path, v.Events<Message>>
  ) => void;
}

const svgNameSpace = "http://www.w3.org/2000/svg";

const elementToHtmlOrSvgElement = <Message>(
  element: v.Element<Message>,
  path: v.Path,
  patchState: PatchState<Message>
): HTMLElement | SVGElement => {
  switch (element.tag) {
    case "div": {
      const div = document.createElement("div");
      setId(div, element.id);
      div.className = element.class;
      applyChildren(div, element.children, path, patchState);
      setEvents(div, path, patchState);
      return div;
    }
    case "externalLink": {
      const externalLink = document.createElement("a");
      setId(externalLink, element.id);
      externalLink.className = element.class;
      externalLink.href = element.url;
      applyChildren(externalLink, element.children, path, patchState);
      setEvents(externalLink, path, patchState);
      return externalLink;
    }
    case "localLink": {
      const localLink = document.createElement("a");
      setId(localLink, element.id);
      localLink.className = element.class;
      localLink.href = element.url;
      applyChildren(localLink, element.children, path, patchState);
      setEvents(localLink, path, patchState);
      return localLink;
    }
    case "button": {
      const button = document.createElement("button");
      setId(button, element.id);
      button.className = element.class;
      applyChildren(button, element.children, path, patchState);
      setEvents(button, path, patchState);
      return button;
    }
    case "img": {
      const img = document.createElement("img");
      setId(img, element.id);
      img.className = element.class;
      img.alt = element.alt;
      img.src = element.src;
      setEvents(img, path, patchState);
      return img;
    }
    case "inputRadio": {
      const inputRadio = document.createElement("input");
      setId(inputRadio, element.id);
      inputRadio.className = element.class;
      inputRadio.type = "radio";
      inputRadio.name = element.name;
      inputRadio.checked = element.checked;
      setEvents(inputRadio, path, patchState);
      return inputRadio;
    }
    case "inputText": {
      const inputText = document.createElement("input");
      setId(inputText, element.id);
      inputText.className = element.class;
      inputText.type = "text";
      inputText.value = element.value;
      inputText.readOnly = element.inputOrReadonly === null;
      setEvents(inputText, path, patchState);
      return inputText;
    }
    case "textArea": {
      const textArea = document.createElement("textarea");
      setId(textArea, element.id);
      textArea.className = element.class;
      textArea.value = element.value;
      textArea.readOnly = element.inputOrReadonly === null;
      setEvents(textArea, path, patchState);
      return textArea;
    }
    case "label": {
      const label = document.createElement("label");
      setId(label, element.id);
      label.className = element.class;
      label.htmlFor = element.for;
      applyChildren(label, element.children, path, patchState);
      setEvents(label, path, patchState);
      return label;
    }
    case "svg": {
      const svg = document.createElementNS(svgNameSpace, "svg");
      setId(svg, element.id);
      svg.classList.value = element.class;
      svg.viewBox.baseVal.x = element.viewBoxX;
      svg.viewBox.baseVal.y = element.viewBoxY;
      svg.viewBox.baseVal.width = element.viewBoxWidth;
      svg.viewBox.baseVal.height = element.viewBoxHeight;
      applyChildren(svg, element.children, path, patchState);
      setEvents(svg, path, patchState);
      return svg;
    }
    case "path": {
      const pathElement = document.createElementNS(svgNameSpace, "path");
      setId(pathElement, element.id);
      pathElement.classList.value = element.class;
      pathElement.setAttribute("d", element.d);
      pathElement.setAttribute("fill", element.fill);
      setEvents(pathElement, path, patchState);
      return pathElement;
    }
    case "circle": {
      const circle = document.createElementNS(svgNameSpace, "circle");
      setId(circle, element.id);
      circle.classList.value = element.class;
      circle.setAttribute("fill", element.fill);
      circle.setAttribute("stroke", element.stroke);
      circle.cx.baseVal.value = element.cx;
      circle.cy.baseVal.value = element.cy;
      circle.r.baseVal.value = element.r;
      applyChildren(circle, element.children, path, patchState);
      setEvents(circle, path, patchState);
      return circle;
    }
    case "animate": {
      const animate = document.createElementNS(svgNameSpace, "animate");
      animate.setAttribute("attributeName", element.attributeName);
      animate.setAttribute("dur", element.dur.toString());
      animate.setAttribute("repeatCount", element.repeatCount);
      animate.setAttribute("from", element.from);
      animate.setAttribute("to", element.to);
      return animate;
    }
  }
};

const applyChildren = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  children: v.Children<Message>,
  path: v.Path,
  patchState: PatchState<Message>
): void => {
  if (children.tag === v.childrenTextTag) {
    htmlOrSvgElement.textContent = children.value;
    return;
  }
  for (const [childKey, child] of children.value) {
    htmlOrSvgElement.appendChild(
      elementToHtmlOrSvgElement(
        child,
        v.pathAppendKey(path, childKey),
        patchState
      )
    );
  }
};

// eslint-disable-next-line complexity
const pathElement = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  diff: v.ElementUpdateDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
): void => {
  switch (diff.tag) {
    case "div":
      if (!(htmlOrSvgElement instanceof HTMLDivElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLDivElement");
      }
      patchDiv(htmlOrSvgElement, diff, patchState, path);
      return;

    case "externalLink":
    case "localLink":
      if (!(htmlOrSvgElement instanceof HTMLAnchorElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLAnchorElement");
      }
      patchAnchor(htmlOrSvgElement, diff, patchState, path);
      return;

    case "button":
      if (!(htmlOrSvgElement instanceof HTMLButtonElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLButtonElement");
      }
      patchButton(htmlOrSvgElement, diff, patchState, path);
      return;
    case "img":
      if (!(htmlOrSvgElement instanceof HTMLImageElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLImageElement");
      }
      patchImg(htmlOrSvgElement, diff);
      return;
    case "inputRadio":
      if (!(htmlOrSvgElement instanceof HTMLInputElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLInputElement");
      }
      patchInputRadio(htmlOrSvgElement, diff);
      return;
    case "inputText":
      if (!(htmlOrSvgElement instanceof HTMLInputElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLInputElement");
      }
      patchInputText(htmlOrSvgElement, diff);
      return;
    case "textArea":
      if (!(htmlOrSvgElement instanceof HTMLTextAreaElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLTextAreaElement");
      }
      patchTextArea(htmlOrSvgElement, diff);
      return;
    case "label":
      if (!(htmlOrSvgElement instanceof HTMLLabelElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect HTMLLabelElement");
      }
      patchLabel(htmlOrSvgElement, diff, patchState, path);
      return;
    case "svg":
      if (!(htmlOrSvgElement instanceof SVGSVGElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect SVGSVGElement");
      }
      patchSvg(htmlOrSvgElement, diff, patchState, path);
      return;
    case "path":
      if (!(htmlOrSvgElement instanceof SVGPathElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect SVGPathElement");
      }
      patchSvgPath(htmlOrSvgElement, diff);
      return;
    case "circle":
      if (!(htmlOrSvgElement instanceof SVGCircleElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect SVGCircleElement");
      }
      patchSvgCircle(htmlOrSvgElement, diff, patchState, path);
      return;
    case "animate":
      if (!(htmlOrSvgElement instanceof SVGAnimateElement)) {
        console.error(htmlOrSvgElement, diff, path);
        throw new Error("expect SVGAnimateElement");
      }
      patchSvgAnimate(htmlOrSvgElement, diff);
  }
};

const patchDiv = <Message>(
  realElement: HTMLDivElement,
  diff: v.DivDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchAnchor = <Message>(
  realElement: HTMLAnchorElement,
  diff: v.ExternalLinkDiff<Message> | v.LocalLinkDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.url !== undefined) {
    realElement.href = diff.url;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchButton = <Message>(
  realElement: HTMLButtonElement,
  diff: v.ButtonDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchImg = (realElement: HTMLImageElement, diff: v.ImgDiff) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.alt !== undefined) {
    realElement.alt = diff.alt;
  }
  if (diff.src !== undefined) {
    realElement.src = diff.src;
  }
};

const patchInputRadio = (
  realElement: HTMLInputElement,
  diff: v.InputRadioDiff
) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.checked !== undefined) {
    realElement.checked = diff.checked;
  }
  if (diff.name !== undefined) {
    realElement.name = diff.name;
  }
};

const patchInputText = (
  realElement: HTMLInputElement,
  diff: v.InputTextDiff
): void => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.readonly !== undefined) {
    realElement.readOnly = diff.readonly;
  }
  if (diff.value !== undefined) {
    realElement.value = diff.value;
  }
};

const patchTextArea = (
  realElement: HTMLTextAreaElement,
  diff: v.TextAreaDiff
): void => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.readonly !== undefined) {
    realElement.readOnly = diff.readonly;
  }
  if (diff.value !== undefined) {
    realElement.value = diff.value;
  }
};

const patchLabel = <Message>(
  realElement: HTMLLabelElement,
  diff: v.LabelDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
): void => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.className = diff.class;
  }
  if (diff.for !== undefined) {
    realElement.htmlFor = diff.for;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchSvg = <Message>(
  realElement: SVGSVGElement,
  diff: v.SvgDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
): void => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.classList.value = diff.class;
  }
  if (diff.viewBoxX !== undefined) {
    realElement.viewBox.baseVal.x = diff.viewBoxX;
  }
  if (diff.viewBoxY !== undefined) {
    realElement.viewBox.baseVal.y = diff.viewBoxY;
  }
  if (diff.viewBoxWidth !== undefined) {
    realElement.viewBox.baseVal.width = diff.viewBoxWidth;
  }
  if (diff.viewBoxHeight !== undefined) {
    realElement.viewBox.baseVal.height = diff.viewBoxHeight;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchSvgPath = (realElement: SVGPathElement, diff: v.SvgPathDiff) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.classList.value = diff.class;
  }
  if (diff.d !== undefined) {
    realElement.setAttribute("d", diff.d);
  }
  if (diff.fill !== undefined) {
    realElement.setAttribute("fill", diff.fill);
  }
};

const patchSvgCircle = <Message>(
  realElement: SVGCircleElement,
  diff: v.SvgCircleDiff,
  patchState: PatchState<Message>,
  path: v.Path
) => {
  if (diff.id !== undefined) {
    setId(realElement, diff.id);
  }
  if (diff.class !== undefined) {
    realElement.classList.value = diff.class;
  }
  if (diff.fill !== undefined) {
    realElement.setAttribute("fill", diff.fill);
  }
  if (diff.stroke !== undefined) {
    realElement.setAttribute("stroke", diff.stroke);
  }
  if (diff.cx !== undefined) {
    realElement.cx.baseVal.value = diff.cx;
  }
  patchChildren(realElement, diff.children, patchState, path);
};

const patchSvgAnimate = (
  realElement: SVGAnimateElement,
  diff: v.SvgAnimateDiff
): void => {
  if (diff.attributeName !== undefined) {
    realElement.setAttribute("attributeName", diff.attributeName);
  }
  if (diff.dur !== undefined) {
    realElement.setAttribute("dur", diff.dur.toString());
  }
  if (diff.repeatCount !== undefined) {
    realElement.setAttribute("repeatCount", diff.repeatCount);
  }
  if (diff.from !== undefined) {
    realElement.setAttribute("from", diff.from);
  }
  if (diff.to !== undefined) {
    realElement.setAttribute("to", diff.to);
  }
};

const patchChildren = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  diff: v.ChildrenDiff<Message>,
  patchState: PatchState<Message>,
  path: v.Path
) => {
  switch (diff.kind) {
    case "skip":
      return;
    case "setText":
      htmlOrSvgElement.textContent = diff.text;
      return;
    case "resetAndInsert":
      htmlOrSvgElement.textContent = "";
      for (const [childKey, child] of diff.value) {
        htmlOrSvgElement.appendChild(
          elementToHtmlOrSvgElement(
            child,
            v.pathAppendKey(path, childKey),
            patchState
          )
        );
      }
      return;
    case "childDiffList":
      diff.children.reduce<number>(
        (index, childDiff) =>
          applyChild(htmlOrSvgElement, index, childDiff, path, patchState),
        0
      );
  }
};

const setId = (htmlOrSvgElement: HTMLElement | SVGElement, newId: string) => {
  if (newId === "") {
    htmlOrSvgElement.removeAttribute("id");
    return;
  }
  htmlOrSvgElement.id = newId;
};

const setEvents = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  path: v.Path,
  patchState: PatchState<Message>
) => {
  htmlOrSvgElement.addEventListener("click", (mouseEvent) =>
    patchState.clickEventHandler(path, mouseEvent as MouseEvent)
  );
  htmlOrSvgElement.addEventListener("change", (event) => {
    patchState.changeEventHandler(path, event);
  });
  htmlOrSvgElement.addEventListener("input", (inputEvent) => {
    patchState.inputEventHandler(path, inputEvent as InputEvent);
  });
};

/**
 *
 * @param childDiff
 * @param index
 * @returns 次のインデックス
 */
const applyChild = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  index: number,
  childDiff: v.ElementDiff<Message>,
  path: v.Path,
  patchState: PatchState<Message>
): number => {
  switch (childDiff.kind) {
    case "insert": {
      if (index === 0) {
        const afterNode = htmlOrSvgElement.firstChild;
        if (afterNode === null) {
          htmlOrSvgElement.appendChild(
            elementToHtmlOrSvgElement(
              childDiff.element,
              v.pathAppendKey(path, childDiff.key),
              patchState
            )
          );
          return index + 1;
        }
        afterNode.before(
          elementToHtmlOrSvgElement(
            childDiff.element,
            v.pathAppendKey(path, childDiff.key),
            patchState
          )
        );
        return index + 1;
      }
      htmlOrSvgElement.childNodes[index - 1].after(
        elementToHtmlOrSvgElement(
          childDiff.element,
          v.pathAppendKey(path, childDiff.key),
          patchState
        )
      );
      return index + 1;
    }
    case "delete": {
      htmlOrSvgElement.childNodes[index].remove();
      return index;
    }
    case "replace": {
      htmlOrSvgElement.childNodes[index].replaceWith(
        elementToHtmlOrSvgElement(
          childDiff.newElement,
          v.pathAppendKey(path, childDiff.key),
          patchState
        )
      );
      return index + 1;
    }
    case "update": {
      pathElement(
        htmlOrSvgElement.childNodes[index] as HTMLElement,
        childDiff.elementUpdateDiff,
        patchState,
        v.pathAppendKey(path, childDiff.key)
      );
      return index + 1;
    }
  }
};

const themeColorName = "theme-color";

/**
 * applyViewをする前に事前に実行する必要あり
 */
export const createPatchState = <Message>(
  messageHandler: (message: Message) => void
): PatchState<Message> => {
  let messageDataMap: ReadonlyMap<string, v.Events<Message>> = new Map();
  return {
    clickEventHandler: (path: string, mouseEvent: MouseEvent): void => {
      const messageData = messageDataMap.get(path)?.onClick;
      if (messageData === undefined) {
        return;
      }
      if (messageData.ignoreNewTab) {
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
      }
      messageHandler(messageData.message);
    },
    changeEventHandler: (path: string, event: Event): void => {
      const messageData = messageDataMap.get(path)?.onChange;
      if (messageData === undefined) {
        return;
      }
      messageHandler(messageData);
    },
    inputEventHandler: (path: string, inputEvent: InputEvent): void => {
      const messageData = messageDataMap.get(path)?.onInput;
      if (messageData === undefined) {
        return;
      }
      messageHandler(
        messageData(
          (inputEvent.target as HTMLInputElement | HTMLTextAreaElement).value
        )
      );
    },
    setMessageDataMap: (
      newMap: ReadonlyMap<string, v.Events<Message>>
    ): void => {
      messageDataMap = newMap;
    },
  };
};

const getOrCreateThemeColorMetaElement = (): HTMLMetaElement => {
  const themeColorMetaElementOrUndefined = getThemeColorMetaElement();
  if (themeColorMetaElementOrUndefined !== undefined) {
    return themeColorMetaElementOrUndefined;
  }
  const newMetaElement = document.createElement("meta");
  document.head.appendChild(newMetaElement);
  newMetaElement.name = themeColorName;
  return newMetaElement;
};

const getThemeColorMetaElement = (): HTMLMetaElement | undefined => {
  const themeColorMetaElementOrNull = document
    .getElementsByTagName("meta")
    .namedItem(themeColorName);
  if (themeColorMetaElementOrNull === null) {
    return undefined;
  }
  return themeColorMetaElementOrNull;
};

/**
 * すべてをリセットして再描画する. 最初に1回呼ぶと良い.
 */
export const renderView = <Message>(
  view: v.View<Message>,
  patchState: PatchState<Message>
): void => {
  document.title = view.title;
  const themeColorMetaElement = getOrCreateThemeColorMetaElement();
  if (view.themeColor === undefined) {
    themeColorMetaElement.remove();
  } else {
    themeColorMetaElement.content = colorToHexString(view.themeColor);
  }
  document.documentElement.lang = languageToIETFLanguageTag(view.language);
  document.body.className = view.bodyClass;
  patchChildren(
    document.body,
    view.children.tag === v.childrenTextTag
      ? {
          kind: "setText",
          text: view.children.value,
        }
      : {
          kind: "resetAndInsert",
          value: view.children.value,
        },
    patchState,
    v.rootPath
  );
};
/**
 * 指定したHTMLの中身などを差分データに合わせて変える
 * DOMのAPIを呼ぶのでブラウザでしか動かない. Node.js では動かない
 * @param themeColorMetaElement `getOrCreateThemeColorHtmlMetaElement` で得たものを使う
 * @param divOrBodyElement 中身を差分データによって変えたいHTMLの要素
 * @param viewDiff 差分データ
 */
export const patchView = <Message>(
  viewDiff: v.ViewDiff<Message>,
  patchState: PatchState<Message>
): void => {
  patchState.setMessageDataMap(viewDiff.newMessageDataMap);
  if (viewDiff.newTitle !== undefined) {
    document.title = viewDiff.newTitle;
  }
  if (viewDiff.newThemeColor._ === "Just") {
    const themeColorMetaElement = getOrCreateThemeColorMetaElement();
    if (viewDiff.newThemeColor.value === undefined) {
      themeColorMetaElement.remove();
    } else {
      themeColorMetaElement.content = colorToHexString(
        viewDiff.newThemeColor.value
      );
    }
  }
  if (viewDiff.newLanguage !== undefined) {
    document.documentElement.lang = languageToIETFLanguageTag(
      viewDiff.newLanguage
    );
  }
  if (viewDiff.newBodyClass !== undefined) {
    document.body.className = viewDiff.newBodyClass;
  }
  patchChildren(document.body, viewDiff.childrenDiff, patchState, v.rootPath);
};

const colorToHexString = (color: v.Color): string =>
  "#" +
  numberTo1byteString(color.r) +
  numberTo1byteString(color.g) +
  numberTo1byteString(color.b);

/**
 * 0...1 を 00...ff に変換する
 */
const numberTo1byteString = (value: number): string =>
  Math.max(Math.floor(value * 256), 255)
    .toString(16)
    .padStart(2, "0");

const languageToIETFLanguageTag = (language: d.Language): string => {
  switch (language) {
    case "Japanese":
      return "ja";
    case "English":
      return "en";
    case "Esperanto":
      return "eo";
  }
};

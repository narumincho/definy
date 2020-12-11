import * as d from "./data";
import {
  AttributesAndChildren,
  Children,
  Color,
  Element,
  View,
  childrenElementList,
  childrenText,
  childrenTextTag,
} from "./view";
import {
  AttributesAndChildrenDiff,
  AttributesDiff,
  ElementDiff,
  EventsDiff,
  ViewDiff,
} from "./diff";

interface PatchState<Message> {
  messageHandler: (message: Message) => void;
}

const svgNameSpace = "http://www.w3.org/2000/svg";

/**
 * 実際の DOM の状況を View に変換する.
 * イベントなどは, 変換できない
 */
export const domToView = (): d.Result<View<never>, d.GetViewError> => {
  const language = ietfLanguageTagToLanguage(document.documentElement.lang);
  if (language === undefined) {
    return d.Result.Error(
      d.GetViewError.UnknownLanguageTag(document.body.lang)
    );
  }
  const themeColorMetaElement = getThemeColorMetaElement();

  return d.Result.Ok({
    language,
    themeColor:
      themeColorMetaElement === undefined ? undefined : { r: 0, g: 0, b: 0 },
    title: document.title,
    attributeAndChildren: htmlElementToAttributesAndChildren(document.body),
  });
};

export const htmlElementToAttributesAndChildren = (
  htmlOrSvgElement: HTMLElement | SVGElement
): AttributesAndChildren<never> => {
  const attributeMap = new Map(
    namedNodeMapToIterator(htmlOrSvgElement.attributes)
  );
  attributeMap.delete("data-key");
  return {
    attributes: attributeMap,
    events: new Map<string, never>(),
    children: htmlElementChildNodesToChildren(htmlOrSvgElement.childNodes),
  };
};

export const htmlElementToElement = (
  htmlOrSvgtElement: HTMLElement | SVGElement
): Element<never> => ({
  tagName: htmlOrSvgtElement.tagName.toLowerCase(),
  attributeAndChildren: htmlElementToAttributesAndChildren(htmlOrSvgtElement),
  isSvg: htmlOrSvgtElement.namespaceURI === svgNameSpace,
});

const htmlElementChildNodesToChildren = (
  childNodes: NodeListOf<ChildNode>
): Children<never> => {
  if (childNodes.length === 0) {
    return childrenText("");
  }
  const childElementList: Array<[string, Element<never>]> = [];
  for (const child of Array.from(childNodes)) {
    if (
      child instanceof Text &&
      typeof child.nodeValue === "string" &&
      child.nodeValue.trim().length !== 0
    ) {
      return childrenText(child.nodeValue);
    }
    if (child instanceof HTMLElement) {
      const { key } = child.dataset;
      if (key !== undefined) {
        childElementList.push([key, htmlElementToElement(child)]);
      }
    }
  }
  return childrenElementList(new Map(childElementList));
};

const namedNodeMapToIterator = (
  attributes: NamedNodeMap
): Iterable<[string, string]> => {
  let index = 0;
  return {
    [Symbol.iterator]: (): Iterator<[string, string]> => ({
      next: (): IteratorResult<[string, string]> => {
        const item = attributes.item(index);
        if (item === null) {
          return {
            done: true,
            value: undefined,
          };
        }
        index += 1;
        return {
          done: false,
          value: [item.name, item.value],
        };
      },
    }),
  };
};

const elementToHtmlOrSvgElement = <Message>(
  element: Element<Message>,
  key: string,
  patchState: PatchState<Message>
): HTMLElement | SVGElement => {
  const htmlElement: HTMLElement | SVGElement = element.isSvg
    ? document.createElementNS(svgNameSpace, element.tagName)
    : document.createElement(element.tagName);
  htmlElement.dataset.key = key;

  setAttributes(htmlElement, element.attributeAndChildren.attributes);
  setEvents(htmlElement, element.attributeAndChildren.events, patchState);

  if (element.attributeAndChildren.children.tag === childrenTextTag) {
    htmlElement.textContent = element.attributeAndChildren.children.value;
    return htmlElement;
  }
  for (const [childKey, child] of element.attributeAndChildren.children.value) {
    htmlElement.appendChild(
      elementToHtmlOrSvgElement(child, childKey, patchState)
    );
  }
  return htmlElement;
};

const applyAttributesAndChildren = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  attributeAndChildrenDiff: AttributesAndChildrenDiff<Message>,
  patchState: PatchState<Message>
): void => {
  applyAttributes(htmlOrSvgElement, attributeAndChildrenDiff.attributes);
  applyEvents(htmlOrSvgElement, attributeAndChildrenDiff.events, patchState);
  switch (attributeAndChildrenDiff.children.kind) {
    case "skip":
      return;
    case "setText":
      htmlOrSvgElement.textContent = attributeAndChildrenDiff.children.text;
      return;
    case "resetAndInsert":
      htmlOrSvgElement.textContent = "";
      for (const [childKey, child] of attributeAndChildrenDiff.children.value) {
        htmlOrSvgElement.appendChild(
          elementToHtmlOrSvgElement(child, childKey, patchState)
        );
      }
      return;
    case "childDiffList":
      attributeAndChildrenDiff.children.children.reduce<number>(
        (index, childDiff) =>
          applyChild(htmlOrSvgElement, index, childDiff, patchState),
        0
      );
  }
};

const applyAttributes = (
  htmlOrSvgElement: HTMLElement | SVGElement,
  attributesDiff: AttributesDiff
): void => {
  for (const attributeName of attributesDiff.deleteNameSet) {
    htmlOrSvgElement.removeAttribute(attributeName);
  }

  setAttributes(htmlOrSvgElement, attributesDiff.setNameValueMap);
};

const setAttributes = (
  htmlOrSvgElement: HTMLElement | SVGElement,
  setNameValueMap: ReadonlyMap<string, string>
) => {
  for (const [attributeName, attributeValue] of setNameValueMap) {
    htmlOrSvgElement.setAttribute(attributeName, attributeValue);
  }
};

const applyEvents = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  eventsDiff: EventsDiff<Message>,
  patchState: PatchState<Message>
): void => {
  for (const eventName of eventsDiff.deleteNameSet) {
    setOrDeleteEventHandler(htmlOrSvgElement, eventName, null);
  }
  setEvents(htmlOrSvgElement, eventsDiff.setNameValueMap, patchState);
};

const setEvents = <Message>(
  htmlOrSvgElement: HTMLElement | SVGElement,
  setNameValueMap: ReadonlyMap<string, Message>,
  patchState: PatchState<Message>
) => {
  for (const [eventName, message] of setNameValueMap) {
    const handler = () => {
      patchState.messageHandler(message);
    };
    setOrDeleteEventHandler(htmlOrSvgElement, eventName, handler);
  }
};

const setOrDeleteEventHandler = (
  htmlOrSvgElement: HTMLElement | SVGElement,
  eventName: string,
  eventHandlerOrNull: ((event: Event) => void) | null
): void => {
  ((htmlOrSvgElement as unknown) as Record<
    string,
    ((event: Event) => void) | null
  >)["on" + eventName] = eventHandlerOrNull;
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
  childDiff: ElementDiff<Message>,
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
              childDiff.key,
              patchState
            )
          );
          return index + 1;
        }
        afterNode.before(
          elementToHtmlOrSvgElement(
            childDiff.element,
            childDiff.key,
            patchState
          )
        );
        return index + 1;
      }
      htmlOrSvgElement.childNodes[index - 1].after(
        elementToHtmlOrSvgElement(childDiff.element, childDiff.key, patchState)
      );
      return index + 1;
    }
    case "delete": {
      htmlOrSvgElement.childNodes[index].remove();
      return index;
    }
    case "replace": {
      htmlOrSvgElement.childNodes[index].replaceWith(
        elementToHtmlOrSvgElement(childDiff.newElement, "???", patchState)
      );
      return index + 1;
    }
    case "update": {
      applyAttributesAndChildren(
        htmlOrSvgElement.childNodes[index] as HTMLElement,
        childDiff.attributeAndChildren,
        patchState
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
  return {
    messageHandler,
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
 * 指定したHTMLの中身などを差分データに合わせて変える
 * DOMのAPIを呼ぶのでブラウザでしか動かない. Node.js では動かない
 * @param themeColorMetaElement `getOrCreateThemeColorHtmlMetaElement` で得たものを使う
 * @param divOrBodyElement 中身を差分データによって変えたいHTMLの要素
 * @param viewDiff 差分データ
 */
export const patchView = <Message>(
  viewDiff: ViewDiff<Message>,
  patchState: PatchState<Message>
): void => {
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
  applyAttributesAndChildren(
    document.body,
    viewDiff.attributeAndChildren,
    patchState
  );
};

const colorToHexString = (color: Color): string =>
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

const ietfLanguageTagToLanguage = (
  ietfLanguageTag: string
): d.Language | undefined => {
  switch (ietfLanguageTag) {
    case "ja":
      return d.Language.Japanese;
    case "en":
      return d.Language.English;
    case "eo":
      return d.Language.Esperanto;
  }
  return undefined;
};

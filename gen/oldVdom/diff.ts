import {
  Children,
  ChildrenDiff,
  Color,
  Element,
  ElementDiff,
  ElementUpdateDiff,
  Events,
  Path,
  View,
  ViewDiff,
  ViewPatchOperation,
  childrenElementListTag,
  childrenTextTag,
  pathAppendKey,
  rootPath,
} from "./view";

export const createViewDiff = <Message>(
  oldView: View<Message>,
  newView: View<Message>
): ViewDiff<Message> => {
  const newPatchOperationList: Array<ViewPatchOperation> = [];
  if (oldView.pageName !== newView.pageName) {
    newPatchOperationList.push({
      tag: "changePageName",
      newTitle: newView.pageName,
    });
  }
  if (!isEqualColor(oldView.themeColor, newView.themeColor)) {
    newPatchOperationList.push({
      tag: "changeThemeColor",
      newThemeColor: newView.themeColor,
    });
  }
  if (oldView.language !== newView.language) {
    newPatchOperationList.push({
      tag: "changeLanguage",
      newLanguage: newView.language,
    });
  }
  if (oldView.bodyClass !== newView.bodyClass) {
    newPatchOperationList.push({
      tag: "changeBodyClass",
      newClass: newView.bodyClass,
    });
  }
  return {
    patchOperationList: newPatchOperationList,
    childrenDiff: createChildrenDiff(oldView.children, newView.children),
    newMessageData: {
      messageMap: createMessageDataMap(newView.children),
      pointerMove: newView.pointerMove,
      pointerDown: newView.pointerDown,
    },
  };
};

/**
 * 色を変更を検知する
 * @returns null 色の指定がないというように変更する必要がある. undefined 色の変更はなし
 */
const isEqualColor = (
  oldColor: Color | undefined,
  newColor: Color | undefined
): boolean => {
  if (oldColor === newColor) {
    return true;
  }
  if (oldColor === undefined || newColor === undefined) {
    return false;
  }
  return (
    oldColor.r === newColor.r &&
    oldColor.g === newColor.g &&
    oldColor.b === newColor.b
  );
};

const update = <Message>(
  elementUpdateDiff: ElementUpdateDiff<Message>,
  key: string
): ElementDiff<Message> => ({
  kind: "update",
  elementUpdateDiff,
  key,
});

const skip: ElementDiff<never> = {
  kind: "skip",
};

// eslint-disable-next-line complexity
export const createElementDiff = <Message>(
  oldElement: Element<Message>,
  newElement: Element<Message>,
  newKey: string
): ElementDiff<Message> => {
  if (oldElement.tag === "div" && newElement.tag === "div") {
    const idDiff = createStringDiff(oldElement.id, newElement.id);
    const classDiff = createStringDiff(oldElement.class, newElement.class);
    const childrenDiff = createChildrenDiff(
      oldElement.children,
      newElement.children
    );
    if (
      idDiff === undefined &&
      classDiff === undefined &&
      childrenDiff.kind === "skip"
    ) {
      return skip;
    }
    return update(
      {
        tag: "div",
        id: idDiff,
        class: classDiff,
        children: childrenDiff,
      },
      newKey
    );
  }
  if (oldElement.tag === "externalLink" && newElement.tag === "externalLink") {
    return update(
      {
        tag: "externalLink",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),

        url: createStringDiff(oldElement.url, newElement.url),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "localLink" && newElement.tag === "localLink") {
    return update(
      {
        tag: "localLink",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),

        url: createStringDiff(oldElement.url, newElement.url),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "button" && newElement.tag === "button") {
    return update(
      {
        tag: "button",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "img" && newElement.tag === "img") {
    return update(
      {
        tag: "img",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        alt: createStringDiff(oldElement.alt, newElement.alt),
        src: createStringDiff(oldElement.src, newElement.src),
      },
      newKey
    );
  }
  if (oldElement.tag === "inputRadio" && newElement.tag === "inputRadio") {
    return update(
      {
        tag: "inputRadio",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        checked: booleanDiff(oldElement.checked, newElement.checked),
        name: createStringDiff(oldElement.name, newElement.name),
      },
      newKey
    );
  }
  if (oldElement.tag === "inputText" && newElement.tag === "inputText") {
    return update(
      {
        tag: "inputText",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        readonly: createReadonlyDiff(
          oldElement.inputOrReadonly,
          newElement.inputOrReadonly
        ),
        value: createStringDiff(oldElement.value, newElement.value),
      },
      newKey
    );
  }
  if (oldElement.tag === "textArea" && newElement.tag === "textArea") {
    return update(
      {
        tag: "textArea",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        readonly: createReadonlyDiff(
          oldElement.inputOrReadonly,
          newElement.inputOrReadonly
        ),
        value: createStringDiff(oldElement.value, newElement.value),
      },
      newKey
    );
  }
  if (oldElement.tag === "label" && newElement.tag === "label") {
    return update(
      {
        tag: "label",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        for: createStringDiff(oldElement.for, newElement.for),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "svg" && newElement.tag === "svg") {
    return update(
      {
        tag: "svg",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        viewBoxX: createNumberDiff(oldElement.viewBoxX, newElement.viewBoxX),
        viewBoxY: createNumberDiff(oldElement.viewBoxY, newElement.viewBoxY),
        viewBoxWidth: createNumberDiff(
          oldElement.viewBoxWidth,
          newElement.viewBoxWidth
        ),
        viewBoxHeight: createNumberDiff(
          oldElement.viewBoxHeight,
          newElement.viewBoxHeight
        ),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "path" && newElement.tag === "path") {
    return update(
      {
        tag: "path",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        d: createStringDiff(oldElement.d, newElement.d),
        fill: createStringDiff(oldElement.fill, newElement.fill),
      },
      newKey
    );
  }
  if (oldElement.tag === "circle" && newElement.tag === "circle") {
    return update(
      {
        tag: "circle",
        id: createStringDiff(oldElement.id, newElement.id),
        class: createStringDiff(oldElement.class, newElement.class),
        fill: createStringDiff(oldElement.fill, newElement.fill),
        stroke: createStringDiff(oldElement.stroke, newElement.stroke),
        cx: createNumberDiff(oldElement.cx, newElement.cx),
        cy: createNumberDiff(oldElement.cy, newElement.cy),
        r: createNumberDiff(oldElement.r, newElement.r),
        children: createChildrenDiff(oldElement.children, newElement.children),
      },
      newKey
    );
  }
  if (oldElement.tag === "animate" && newElement.tag === "animate") {
    return update(
      {
        tag: "animate",
        attributeName: createStringDiff(
          oldElement.attributeName,
          newElement.attributeName
        ),
        dur: createNumberDiff(newElement.dur, oldElement.dur),
        repeatCount: createStringDiff(
          oldElement.repeatCount,
          newElement.repeatCount
        ),
        from: createStringDiff(oldElement.from, newElement.from),
        to: createStringDiff(oldElement.to, newElement.to),
      },
      newKey
    );
  }
  return { kind: "replace", newElement, key: newKey };
};

const createStringDiff = (
  oldString: string,
  newString: string
): string | undefined => (oldString === newString ? undefined : newString);

const booleanDiff = (
  oldBoolean: boolean,
  newBoolean: boolean
): boolean | undefined => (oldBoolean === newBoolean ? undefined : newBoolean);

const createNumberDiff = (
  oldNumber: number,
  newNumber: number
): number | undefined => (oldNumber === newNumber ? undefined : newNumber);

const createReadonlyDiff = <Message>(
  oldInputOrReadonly: ((newText: string) => Message) | null,
  newInputOrReadonly: ((newText: string) => Message) | null
): boolean | undefined => {
  if (oldInputOrReadonly === null && newInputOrReadonly !== null) {
    return false;
  }
  if (oldInputOrReadonly !== null && newInputOrReadonly === null) {
    return true;
  }
  return undefined;
};

export const createChildrenDiff = <Message>(
  oldChildren: Children<Message>,
  newChildren: Children<Message>
): ChildrenDiff<Message> => {
  if (
    oldChildren.tag === childrenTextTag &&
    newChildren.tag === childrenTextTag &&
    oldChildren.value === newChildren.value
  ) {
    return { kind: "skip" };
  }
  if (newChildren.tag === childrenTextTag) {
    return { kind: "setText", text: newChildren.value };
  }
  if (oldChildren.tag === childrenTextTag) {
    return { kind: "resetAndInsert", value: newChildren.value };
  }
  return {
    kind: "childDiffList",
    children: createElementListChildrenDiff<Message>(
      oldChildren.value,
      newChildren.value
    ),
  };
};

export const createElementListChildrenDiff = <Message>(
  oldChildren: ReadonlyMap<string, Element<Message>>,
  newChildren: ReadonlyMap<string, Element<Message>>
): ReadonlyArray<ElementDiff<Message>> => {
  const oldTagList = [...oldChildren.keys()];

  const removedTags: ReadonlyMap<string | undefined, string> = new Map(
    oldTagList.flatMap<[string | undefined, string]>((tag, index) =>
      newChildren.has(tag) ? [] : [[oldTagList[index - 1], tag]]
    )
  );

  let lastUpdateIndex = 0;
  let updateInSameOrder = true;

  const updates: Array<ElementDiff<Message>> = [];

  /*
   * 削除する必要のある子のすべてのキーと直前のキーを保存する.
   * これにより, 削除の更新を正しい位置に挿入できる.
   */
  const deleteTagsForTag = (newKey: string | undefined) => {
    const deletedKey = removedTags.get(newKey);
    if (deletedKey !== undefined) {
      updates.push({ kind: "delete" });
      deleteTagsForTag(deletedKey);
    }
  };

  // 最初の delete を入れる
  deleteTagsForTag(undefined);

  for (const [newChildKey, newChildElement] of newChildren) {
    const oldChild = oldChildren.get(newChildKey);
    const childResult: CrateChildDiffResult = createChildDiff<Message>(
      newChildKey,
      newChildElement,
      oldChild === undefined
        ? undefined
        : { element: oldChild, index: oldTagList.indexOf(newChildKey) },
      oldChildren.size,
      updates,
      lastUpdateIndex,
      updateInSameOrder,
      deleteTagsForTag
    );
    lastUpdateIndex = childResult.lastUpdateIndex;
    updateInSameOrder = childResult.updateInSameOrder;
  }

  return updates;
};

type CrateChildDiffResult = {
  updateInSameOrder: boolean;
  lastUpdateIndex: number;
};

const createChildDiff = <Message>(
  newChildKey: string,
  newChildElement: Element<Message>,
  oldChildElement: { element: Element<Message>; index: number } | undefined,
  oldChildrenSize: number,
  updates: Array<ElementDiff<Message>>,
  initLastUpdateIndex: number,
  initUpdateInSameOrder: boolean,
  deleteTagsForTag: (tag: string) => void
): CrateChildDiffResult => {
  let updateInSameOrder: boolean = initUpdateInSameOrder;
  /*
   * 古い子の長さを超えた場合、効率的な差分を生成しようとするのではなく、すべてを挿入する必要があります
   */
  const isLonger =
    updates.filter((x) => x.kind !== "insert").length >= oldChildrenSize;

  if (
    oldChildElement !== undefined &&
    oldChildElement.index < initLastUpdateIndex
  ) {
    updateInSameOrder = false;
  }

  /*
   * oldChildren と newChildren の両方に存在するキーの順序が違うときは,
   * 順序が正しくない最初の子の子に対して既存のノードを置き換える
   */
  if (updateInSameOrder) {
    const lastUpdateIndex =
      oldChildElement === undefined
        ? initLastUpdateIndex
        : oldChildElement.index;

    if (oldChildElement === undefined || isLonger) {
      updates.push({
        kind: "insert",
        element: newChildElement,
        key: newChildKey,
      });
      return {
        updateInSameOrder: true,
        lastUpdateIndex,
      };
    }

    updates.push(
      createElementDiff(oldChildElement.element, newChildElement, newChildKey)
    );
    deleteTagsForTag(newChildKey);
    return {
      updateInSameOrder: true,
      lastUpdateIndex,
    };
  }

  if (isLonger) {
    updates.push({
      kind: "insert",
      element: newChildElement,
      key: newChildKey,
    });
  } else {
    updates.push({
      kind: "replace",
      newElement: newChildElement,
      key: newChildKey,
    });
    deleteTagsForTag(newChildKey);
  }

  return {
    updateInSameOrder: false,
    lastUpdateIndex: initLastUpdateIndex,
  };
};

const createMessageDataMap = <Message>(
  children: Children<Message>
): ReadonlyMap<Path, Events<Message>> => {
  const messageDataMap: Map<Path, Events<Message>> = new Map();
  createMessageDataMapChildren(messageDataMap, rootPath, children);
  return messageDataMap;
};

/**
 * @param messageDataMap イベントからどう解釈するかのデータ. 上書きする
 * @param path 要素のパス. key をつなげたもの
 * @param attributeAndChildren 属性と子要素
 */
const createMessageDataMapLoop = <Message>(
  messageDataMap: Map<Path, Events<Message>>,
  path: Path,
  element: Element<Message>
): void => {
  switch (element.tag) {
    case "button":
      messageDataMap.set(path, {
        onClick: {
          message: element.click,
          ignoreNewTab: false,
          stopPropagation: false,
        },
        onChange: undefined,
        onInput: undefined,
      });
      createMessageDataMapChildren(messageDataMap, path, element.children);
      return;
    case "localLink":
      messageDataMap.set(path, {
        onClick: {
          message: element.jumpMessage,
          ignoreNewTab: true,
          stopPropagation: false,
        },
        onChange: undefined,
        onInput: undefined,
      });
      createMessageDataMapChildren(messageDataMap, path, element.children);
      return;
    case "inputRadio":
      messageDataMap.set(path, {
        onClick: undefined,
        onChange: element.select,
        onInput: undefined,
      });
      return;
    case "inputText":
    case "textArea":
      if (element.inputOrReadonly === null) {
        return;
      }
      messageDataMap.set(path, {
        onClick: undefined,
        onChange: undefined,
        onInput: element.inputOrReadonly,
      });
      return;
    case "div":
      if (element.click !== null) {
        messageDataMap.set(path, {
          onClick: element.click,
          onChange: undefined,
          onInput: undefined,
        });
      }
      createMessageDataMapChildren(messageDataMap, path, element.children);
      return;
    case "externalLink":
    case "label":
      createMessageDataMapChildren(messageDataMap, path, element.children);
      return;
    case "svg":
      createMessageDataMapChildren(messageDataMap, path, element.children);
  }
};

const createMessageDataMapChildren = <Message>(
  messageDataMap: Map<Path, Events<Message>>,
  path: Path,
  children: Children<Message>
) => {
  if (children.tag === childrenElementListTag) {
    for (const [key, child] of children.value) {
      createMessageDataMapLoop(messageDataMap, pathAppendKey(path, key), child);
    }
  }
};

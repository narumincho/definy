import * as d from "definy-core/source/data";
import {
  AttributesAndChildren,
  Children,
  Color,
  Element,
  Events,
  Path,
  View,
  childrenTextTag,
  pathAppendKey,
  rootPath,
} from "./view";
import { mapFilter, mapKeyToSet, setSubtract } from "../util";

export interface ViewDiff<Message> {
  readonly attributeAndChildren: AttributesAndChildrenDiff<Message>;
  readonly newTitle: string | undefined;
  readonly newThemeColor: d.Maybe<Color | undefined>;
  readonly newLanguage: d.Language | undefined;
  readonly newMessageDataMap: ReadonlyMap<Path, Events<Message>>;
}

export interface AttributesAndChildrenDiff<Message> {
  readonly attributes: AttributesDiff;
  readonly children: ChildrenDiff<Message>;
}

export interface AttributesDiff {
  readonly setNameValueMap: ReadonlyMap<string, string>;
  readonly deleteNameSet: ReadonlySet<string>;
}

export type ElementDiff<Message> =
  | {
      readonly kind: "replace";
      readonly newElement: Element<Message>;
      readonly key: string;
    }
  | {
      readonly kind: "update";
      readonly attributeAndChildren: AttributesAndChildrenDiff<Message>;
      readonly key: string;
    }
  | {
      readonly kind: "delete";
    }
  | {
      readonly kind: "insert";
      readonly element: Element<Message>;
      readonly key: string;
    };

export type ChildrenDiff<Message> =
  | {
      readonly kind: "skip";
    }
  | {
      readonly kind: "setText";
      readonly text: string;
    }
  | {
      readonly kind: "resetAndInsert";
      readonly value: ReadonlyMap<string, Element<Message>>;
    }
  | {
      readonly kind: "childDiffList";
      readonly children: ReadonlyArray<ElementDiff<Message>>;
    };

export const createViewDiff = <Message>(
  oldView: View<Message>,
  newView: View<Message>
): ViewDiff<Message> => {
  return {
    attributeAndChildren: createAttributesAndChildrenDiff(
      oldView.attributeAndChildren,
      newView.attributeAndChildren
    ),
    newTitle: oldView.title === newView.title ? undefined : newView.title,
    newThemeColor: createColorDiff(oldView.themeColor, newView.themeColor),
    newLanguage:
      oldView.language === newView.language ? undefined : newView.language,
    newMessageDataMap: createMessageDataMap(newView.attributeAndChildren),
  };
};

const createColorDiff = (
  oldColor: Color | undefined,
  newColor: Color | undefined
): d.Maybe<Color | undefined> => {
  if (oldColor === newColor) {
    return d.Maybe.Nothing();
  }
  if (oldColor === undefined || newColor === undefined) {
    return d.Maybe.Just(newColor);
  }
  if (
    oldColor.r === newColor.r &&
    oldColor.g === newColor.g &&
    oldColor.b === newColor.b
  ) {
    return d.Maybe.Nothing();
  }
  return d.Maybe.Just(newColor);
};

export const createElementDiff = <Message>(
  oldElement: Element<Message>,
  newElement: Element<Message>,
  newKey: string
): ElementDiff<Message> => {
  if (oldElement.tagName !== newElement.tagName) {
    return { kind: "replace", newElement, key: newKey };
  }
  return {
    kind: "update",
    attributeAndChildren: createAttributesAndChildrenDiff(
      oldElement.attributeAndChildren,
      newElement.attributeAndChildren
    ),
    key: newKey,
  };
};

const createAttributesAndChildrenDiff = <Message>(
  oldAttributesAndChildren: AttributesAndChildren<Message>,
  newAttributesAndChildren: AttributesAndChildren<Message>
): AttributesAndChildrenDiff<Message> => ({
  attributes: createAttributesDiff(
    oldAttributesAndChildren.attributes,
    newAttributesAndChildren.attributes
  ),
  children: createChildrenDiff(
    oldAttributesAndChildren.children,
    newAttributesAndChildren.children
  ),
});

export const createAttributesDiff = (
  oldAttribute: ReadonlyMap<string, string>,
  newAttribute: ReadonlyMap<string, string>
): AttributesDiff => ({
  deleteNameSet: setSubtract(
    mapKeyToSet(oldAttribute),
    mapKeyToSet(newAttribute)
  ),
  setNameValueMap: mapFilter(
    newAttribute,
    (newValue, newName) => newValue !== oldAttribute.get(newName)
  ),
});

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
    children: createElementListChildrenDiff(
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

interface CrateChildDiffResult {
  updateInSameOrder: boolean;
  lastUpdateIndex: number;
}

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
  attributeAndChildren: AttributesAndChildren<Message>
): ReadonlyMap<Path, Events<Message>> => {
  const messageDataMap: Map<Path, Events<Message>> = new Map();
  createMessageDataMapLoop(messageDataMap, rootPath, attributeAndChildren);
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
  attributeAndChildren: AttributesAndChildren<Message>
): void => {
  messageDataMap.set(path, attributeAndChildren.events);
  if (attributeAndChildren.children.tag === childrenTextTag) {
    return;
  }
  for (const [key, child] of attributeAndChildren.children.value) {
    createMessageDataMapLoop(
      messageDataMap,
      pathAppendKey(path, key),
      child.attributeAndChildren
    );
  }
};

import * as d from "definy-core/source/data";
import {
  AttributesAndChildren,
  Children,
  Color,
  Element,
  View,
  childrenTextTag,
} from "./view";
import { mapFilter, mapKeyToSet, setSubtract } from "../util";

export type ElementDiff<Message> =
  | {
      readonly kind: "replace";
      readonly newElement: Element<Message>;
    }
  | {
      readonly kind: "update";
      readonly attributeAndChildren: AttributesAndChildrenDiff<Message>;
    };

export interface ViewDiff<Message> {
  readonly attributeAndChildren: AttributesAndChildrenDiff<Message>;
  readonly newTitle: string | undefined;
  readonly newThemeColor: d.Maybe<Color | undefined>;
  readonly newLanguage: d.Language | undefined;
}

export interface AttributesAndChildrenDiff<Message> {
  readonly attributes: AttributesDiff;
  readonly events: EventsDiff<Message>;
  readonly children: ChildrenDiff<Message>;
}

export interface AttributesDiff {
  readonly setNameValueMap: ReadonlyMap<string, string>;
  readonly deleteNameSet: ReadonlySet<string>;
}

export interface EventsDiff<Message> {
  readonly setNameValueMap: ReadonlyMap<string, Message>;
  readonly deleteNameSet: ReadonlySet<string>;
}

export type ChildDiff<Message> =
  | ElementDiff<Message>
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
      readonly children: ReadonlyArray<ChildDiff<Message>>;
    };

export const createViewDiff = <Message>(
  oldView: View<Message>,
  newView: View<Message>
): ViewDiff<Message> => ({
  attributeAndChildren: createAttributesAndChildrenDiff(
    oldView.attributeAndChildren,
    newView.attributeAndChildren
  ),
  newTitle: oldView.title === newView.title ? undefined : newView.title,
  newThemeColor: createColorDiff(oldView.themeColor, newView.themeColor),
  newLanguage:
    oldView.language === newView.language ? undefined : newView.language,
});

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
  newElement: Element<Message>
): ElementDiff<Message> => {
  if (oldElement.tagName !== newElement.tagName) {
    return { kind: "replace", newElement };
  }
  return {
    kind: "update",
    attributeAndChildren: createAttributesAndChildrenDiff(
      oldElement.attributeAndChildren,
      newElement.attributeAndChildren
    ),
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
  events: createEventsDiff(
    oldAttributesAndChildren.events,
    newAttributesAndChildren.events
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

const createEventsDiff = <Message>(
  oldEvents: ReadonlyMap<string, Message>,
  newEvents: ReadonlyMap<string, Message>
): EventsDiff<Message> => ({
  deleteNameSet: setSubtract(mapKeyToSet(oldEvents), mapKeyToSet(newEvents)),
  setNameValueMap: mapFilter(
    newEvents,
    (newMessage, newName) => newMessage !== oldEvents.get(newName)
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
): ReadonlyArray<ChildDiff<Message>> => {
  const oldTagList = [...oldChildren.keys()];

  const removedTags: ReadonlyMap<string | undefined, string> = new Map(
    oldTagList.flatMap<[string | undefined, string]>((tag, index) =>
      newChildren.has(tag) ? [] : [[oldTagList[index - 1], tag]]
    )
  );

  let lastUpdateIndex = 0;
  let updateInSameOrder = true;

  const updates: Array<ChildDiff<Message>> = [];

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
  updates: Array<ChildDiff<Message>>,
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

    updates.push(createElementDiff(oldChildElement.element, newChildElement));
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
    });
    deleteTagsForTag(newChildKey);
  }

  return {
    updateInSameOrder: false,
    lastUpdateIndex: initLastUpdateIndex,
  };
};

// vdom の処理
// レンダリングを要求されたら,
// 前回のvdomと今回のvdomを比較する, 変更点を出力する
// 変更点から実DOMへ反映する

// この構造だとcomponentのように状態管理できん!
// componentの木構造を比較するようにすれば良い?

export type VDom = {
  readonly elementName: string;
  readonly attributeMap: ReadonlyMap<string, string>;
  readonly children: ReadonlyArray<VDom> | string;
};

export const div = (
  attribute: { readonly id?: string },
  children: ReadonlyArray<VDom> | string,
): VDom => ({
  elementName: "div",
  attributeMap: new Map([
    ...(attribute.id
      ? [
        ["id", attribute.id],
      ] as const
      : []),
  ]),
  children,
});

export const vdomToString = (vdom: VDom): string =>
  `<${vdom.elementName}${
    vdom.attributeMap.size === 0
      ? ""
      : ` ${[...vdom.attributeMap].map(([k, v]) => `${k}="${v}"`).join(" ")}`
  }>${
    typeof vdom.children === "string"
      ? vdom.children.replaceAll("<", "&gt;")
      : vdom.children.map(vdomToString).join("")
  }</${vdom.elementName}>`;

export const vdomToHtml = (vdom: VDom): string => {
  return "<!doctype html>" + vdomToString(vdom);
};

type Diff = {
  readonly type: "remove";
  readonly path: ReadonlyArray<number>;
} | {
  readonly type: "insertBefore";
  readonly path: ReadonlyArray<number>;
  readonly newNode: VDom;
  readonly index: number | undefined;
} | {
  readonly type: "setAttribute";
  readonly path: ReadonlyArray<number>;
} | {
  readonly type: "setTextContent";
  readonly path: ReadonlyArray<number>;
  readonly value: string;
} | {
  readonly type: "impossible";
};

export const diff = (oldVDom: VDom, newVDom: VDom): ReadonlyArray<Diff> => {
  if (typeof newVDom.children === "string") {
    if (typeof oldVDom.children === "string") {
      if (oldVDom.children === newVDom.children) {
        return [];
      } else {
        return [
          {
            type: "setTextContent",
            path: [],
            value: newVDom.children,
          },
        ];
      }
    } else {
      return [
        {
          type: "setTextContent",
          path: [],
          value: newVDom.children,
        },
      ];
    }
  } else {
    if (typeof oldVDom.children === "string") {
      return newVDom.children.map((child) => ({
        type: "insertBefore",
        index: undefined,
        newNode: child,
        path: [],
      }));
    } else {
      // 編集距離とかあるよなぁ...

      // A B C
      // から
      // B D C
      // に
    }
  }
};

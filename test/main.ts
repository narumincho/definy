import {
  Children,
  Element,
  View,
  childrenElementList,
  childrenText,
} from "../source/view/view";
import {
  createChildrenDiff,
  createElementDiff,
  createViewDiff,
} from "../source/view/diff";
import { createPatchState, domToView, patchView } from "../source/view/patch";
import { div, view } from "../source/view/viewUtil";
import { OrderedMap } from "immutable";

describe("test", () => {
  it("same text return skip", () => {
    const children: Children<never> = childrenText("それな");
    expect(createChildrenDiff(children, children)).toMatchSnapshot();
  });
  it("different text return setText", () => {
    const oldChildren: Children<never> = childrenText("A");
    const newChildren: Children<never> = childrenText("B");
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("element to test return setText", () => {
    const oldChildren: Children<never> = childrenElementList(
      OrderedMap({ element: div<never>({}, "aaa") })
    );
    const newChildren: Children<never> = childrenText("new");
    expect(createChildrenDiff(oldChildren, newChildren));
  });
  it("add attribute", () => {
    const oldElement: Element<never> = div({}, "");
    const newElement: Element<never> = div({ id: "newId" }, "");
    expect(createElementDiff(oldElement, newElement)).toMatchSnapshot();
  });
  it("delete attribute", () => {
    const oldElement: Element<never> = div({ id: "newId" }, "");
    const newElement: Element<never> = div({}, "");
    expect(createElementDiff(oldElement, newElement)).toMatchSnapshot();
  });
  it("add element", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "newC"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("delete element", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        c: div<never>({}, "C"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("replace element", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        new: div<never>({}, "new"),
        c: div<never>({}, "C"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("insert element", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        new: div<never>({}, "new"),
        b: div<never>({}, "B"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("complex diff", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap<Element<never>>({
        A: div({ id: "a" }, OrderedMap({ text: div<never>({}, "a") })),
        B: div({}, "B"),
        C: div(
          {},
          OrderedMap<Element<never>>({
            text: div({}, "C"),
            sub: div({}, "C sub"),
          })
        ),
        D: div({}, "D"),
        E: div({}, "E"),
        F: div({}, "F"),
      })
    );
    const newChildren: Children<never> = childrenElementList(
      OrderedMap<Element<never>>({
        A: div<never>({}, "A"),
        B: div({}, "B"),
        K: div({}, "K"),
        C: div(
          {},
          OrderedMap<Element<never>>({ text: div({}, "C") })
        ),
        S: div({}, "S"),
        E: div({}, "E"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("replace all", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        x: div<never>({}, "X"),
        y: div<never>({}, "Y"),
        z: div<never>({}, "Z"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });

  it("delete all children", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
        nest: div<never>(
          {},
          OrderedMap<Element<never>>({ inner: div<never>({}, "Inner") })
        ),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        x: div<never>({}, "X"),
        y: div<never>({}, "Y"),
        z: div<never>({}, "Z"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("change key order", () => {
    const oldChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        a: div<never>({}, "A"),
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
      })
    );
    const newChildren: Children<never> = childrenElementList<never>(
      OrderedMap({
        b: div<never>({}, "B"),
        c: div<never>({}, "C"),
        a: div<never>({ id: "A" }, "A"),
      })
    );
    expect(createChildrenDiff(oldChildren, newChildren)).toMatchSnapshot();
  });
  it("use fake", () => {
    const oldView: View<never> = view<never>(
      {
        language: "Japanese",
        themeColor: { r: 0, g: 0, b: 0 },
        title: "",
      },
      ""
    );
    const newView: View<never> = view<never>(
      {
        language: "English",
        themeColor: { r: 0, g: 0, b: 0 },
        title: "",
      },
      OrderedMap({ target: div<never>({ id: "target" }, "new") })
    );
    const pathState = createPatchState(() => {});
    const diff = createViewDiff(oldView, newView);
    console.log(diff);
    patchView(diff, pathState);
    const domView = domToView();
    console.log(domView);
    if (domView._ === "Error") {
      throw new Error("DOMからViewを導出できなかった");
    }
    expect(domView.ok.attributeAndChildren).toEqual(
      newView.attributeAndChildren
    );
  });
});

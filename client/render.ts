import { VDom } from "./vdom.ts";

export const hydrate = (element: Element, vdom: VDom): void => {
  requestAnimationFrame(() => {
    // console.log("render", element, vdom);
    element.querySelector("a")?.insertBefore(a, b);
    element.querySelector("a")?.remove();
    element.querySelector("a")?.append();
    // document.body;
  });
};

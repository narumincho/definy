import * as reactDom from "react-dom";
import { StrictMode, createElement as h } from "react";
import { AppWithState } from "./AppWithState";

const appElement = document.createElement("div");

// Bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);
appElement.style.height = "100%";
appElement.style.overflow = "auto";

reactDom.render(h(StrictMode, {}, h(AppWithState)), appElement);

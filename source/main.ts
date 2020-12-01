import * as reactDom from "react-dom";
import { AppWithState } from "./appWithState";
import { StrictMode } from "react";
import { jsx } from "@emotion/react";

const appElement = document.createElement("div");

// Bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);
appElement.style.height = "100%";
appElement.style.overflow = "auto";

reactDom.render(jsx(StrictMode, {}, jsx(AppWithState)), appElement);

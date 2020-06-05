import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app";
import { Context, StyleSheetRenderer } from "react-free-style";

const appElement = document.createElement("div");

// bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);

ReactDOM.render(
  React.createElement(
    React.StrictMode,
    {},
    React.createElement(
      Context.Provider,
      { value: new StyleSheetRenderer() },
      React.createElement(App)
    )
  ),
  appElement
);

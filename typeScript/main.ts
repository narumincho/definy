import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app";
import { Context, StyleSheetRenderer } from "react-free-style";
import * as common from "definy-common";

const appElement = document.createElement("div");

// bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);
appElement.style.height = "100%";
appElement.style.overflow = "auto";

ReactDOM.render(
  React.createElement(
    React.StrictMode,
    {},
    React.createElement(
      Context.Provider,
      { value: new StyleSheetRenderer() },
      React.createElement(App, {
        urlData: common.urlDataAndAccessTokenFromUrl(
          new URL(window.location.href)
        ).urlData,
      })
    )
  ),
  appElement
);

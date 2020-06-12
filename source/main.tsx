import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./App";
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
  <React.StrictMode>
    <Context.Provider value={new StyleSheetRenderer()}>
      <App
        urlData={
          common.urlDataAndAccessTokenFromUrl(new URL(window.location.href))
            .urlData
        }
      />
    </Context.Provider>
  </React.StrictMode>,
  appElement
);

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as common from "definy-common";
import { Context, StyleSheetRenderer } from "react-free-style";
import { App } from "./App";
import * as ui from "./ui";

const appElement = document.createElement("div");

// Bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);
appElement.style.height = "100%";
appElement.style.overflow = "auto";
const headStyleElement = document.createElement("style");
headStyleElement.innerText = ui.commonStyle;
document.head.append(headStyleElement);

console.log(
  common.urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
);

ReactDOM.render(
  <React.StrictMode>
    <Context.Provider value={new StyleSheetRenderer()}>
      <App
        initUrlData={
          common.urlDataAndAccessTokenFromUrl(new URL(window.location.href))
            .urlData
        }
      />
    </Context.Provider>
  </React.StrictMode>,
  appElement
);

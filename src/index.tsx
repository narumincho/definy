import * as React from "react";
import * as ReactDOM from "react-dom";
import * as common from "definy-common";
import { Context, StyleSheetRenderer } from "react-free-style";
import { App } from "./App";

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
headStyleElement.innerText = `/*
Hack typeface https://github.com/source-foundry/Hack
License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/

@font-face {
font-family: "Hack";
font-weight: 400;
font-style: normal;
src: url("./static/hack-regular-subset.woff2") format("woff2");
}

html {
height: 100%;
}

body {
height: 100%;
margin: 0;
background-color: black;
display: grid;
color: white;
}

div[data-elm-hot="true"] {
display: grid;
overflow: auto;
}

* {
box-sizing: border-box;
}`;
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

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as common from "definy-core";
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

const urlDataAndAccessToken = common.urlDataAndAccessTokenFromUrl(
  new URL(window.location.href)
);

ReactDOM.render(
  <React.StrictMode>
    <App
      accessToken={urlDataAndAccessToken.accessToken}
      initUrlData={urlDataAndAccessToken.urlData}
    />
  </React.StrictMode>,
  appElement
);

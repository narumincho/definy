import * as common from "definy-core";
import { AppWithState, Props } from "./AppWithState";
import { h, render } from "preact";

const appElement = document.createElement("div");

// Bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(appElement);
appElement.style.height = "100%";
appElement.style.overflow = "auto";

const urlDataAndAccountToken = common.urlDataAndAccountTokenFromUrl(
  new URL(window.location.href)
);

const appProps: Props = {
  accountToken: urlDataAndAccountToken.accountToken,
  initUrlData: urlDataAndAccountToken.urlData,
};

render(h(AppWithState, appProps), appElement);

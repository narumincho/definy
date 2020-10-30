import * as app from "./App";
import * as common from "definy-core";
import * as maquette from "maquette";

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

const projector = maquette.createProjector();

projector.append(appElement, () => {
  return app.app({
    accountToken: urlDataAndAccountToken.accountToken,
    initUrlData: urlDataAndAccountToken.urlData,
  });
});

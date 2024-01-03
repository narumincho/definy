import { hydrate } from "https://esm.sh/preact@10.19.3";
import { App } from "./app/App.ts";

const appElement = document.getElementById("app");

if (appElement === null) {
  throw new Error("appElement not found");
}

hydrate(App, appElement);

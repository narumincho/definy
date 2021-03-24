import * as React from "react";
import * as ReactDom from "react-dom";
import { App } from "./container/App";

const entryElement = document.createElement("div");
document.body.textContent = "";
document.body.appendChild(entryElement);
ReactDom.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  entryElement
);

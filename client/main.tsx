import * as React from "react";
import * as ReactDom from "react-dom";
import { DefinyApp } from "./App";

const entryElement = document.createElement("div");
document.body.textContent = "";
document.body.appendChild(entryElement);
ReactDom.render(
  <React.StrictMode>
    <DefinyApp />
  </React.StrictMode>,
  entryElement
);

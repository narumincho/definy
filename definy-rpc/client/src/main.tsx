import { App } from "./App";
import React from "react";
import ReactDOM from "react-dom/client";

const rootElement = document.createElement("div");
document.body.style.height = "100%";
document.body.style.margin = "0";
document.documentElement.style.height = "100%";
document.body.appendChild(rootElement);
rootElement.style.height = "100%";

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

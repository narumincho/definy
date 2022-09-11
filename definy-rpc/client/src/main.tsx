import { App } from "./App";
import React from "react";
import ReactDOM from "react-dom/client";

const rootElement = document.createElement("div");
document.body.appendChild(rootElement);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

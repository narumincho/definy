/// <reference no-default-lib="true"/>
/// <reference lib="dom" />

import { App } from "./App.tsx";
import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

const rootElement = document.createElement("div");
document.body.style.height = "100%";
document.body.style.margin = "0";
document.documentElement.style.height = "100%";
document.body.appendChild(rootElement);
rootElement.style.height = "100%";

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* @jsx jsx */
/// <reference lib="dom" />

import { App } from "./App.tsx";
import { StrictMode } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5";

const rootElement = document.createElement("div");
document.body.style.height = "100%";
document.body.style.margin = "0";
document.documentElement.style.height = "100%";
document.body.appendChild(rootElement);
rootElement.style.height = "100%";

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

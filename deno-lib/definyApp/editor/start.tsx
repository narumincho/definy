import React from "https://esm.sh/react@18.2.0";
import { hydrateRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { App } from "./app.tsx";
import { languageFromId } from "../../zodType.ts";

const main = () => {
  const rootElement = document.getElementById("root");
  if (rootElement === null) {
    console.error("rootElement を見つからなかった");
    return;
  }
  const hl = new URLSearchParams(window.location.search).get("hl");

  hydrateRoot(rootElement, <App language={languageFromId(hl)} />);
};

main();

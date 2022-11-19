import React from "https://esm.sh/react@18.2.0?pin=v99";
import { hydrateRoot } from "https://esm.sh/react-dom@18.2.0/client?pin=v99";
import { App } from "./app.tsx";
import { languageFromId } from "../../zodType.ts";

/**
 * definy のエディターを動かす
 *
 * ブラウザ内で動かす必要がある
 */
export const startEditor = (): void => {
  const rootElement = document.getElementById("root");
  if (rootElement === null) {
    console.error("rootElement を見つからなかった");
    return;
  }
  const hl = new URLSearchParams(window.location.search).get("hl");
  const isClock24 = window.location.pathname === "/clock24";

  hydrateRoot(
    rootElement,
    <App language={languageFromId(hl)} isClock24={isClock24} />,
  );
};

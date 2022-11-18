import { hydrateRoot, React } from "../../deps.ts";
import { App } from "./app.tsx";
import { languageFromId } from "../../zodType.ts";

const main = () => {
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

main();

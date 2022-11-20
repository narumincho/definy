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

  hydrateRoot(
    rootElement,
    <AppWithHandleLocation />,
  );
};

const AppWithHandleLocation = (): React.ReactElement => {
  const [url, setUrl] = React.useState<URL>(new URL(window.location.href));

  const hl = url.searchParams.get("hl");
  const isClock24 = url.pathname === "/clock24";

  const date = new Date(url.searchParams.get("time") ?? "");
  return (
    <React.StrictMode>
      <App
        language={languageFromId(hl)}
        message={url.searchParams.get("message") ?? ""}
        date={Number.isNaN(date.getTime()) ? undefined : date}
        isClock24={isClock24}
        onChangeUrl={(newUrl) => {
          window.history.replaceState(undefined, "", newUrl.toString());
          setUrl(newUrl);
        }}
      />
    </React.StrictMode>
  );
};

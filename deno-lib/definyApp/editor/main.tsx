import React from "https://esm.sh/react@18.2.0?pin=v106";
import { hydrateRoot } from "https://esm.sh/react-dom@18.2.0/client?pin=v106";
import { App } from "./app.tsx";
import { simpleUrlToUrlLocation, UrlLocation } from "./url.ts";
import { urlToSimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";

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
  const [urlLocation, setUrlLocation] = React.useState<UrlLocation | undefined>(
    () =>
      simpleUrlToUrlLocation(
        urlToSimpleUrl(new URL(window.location.href)),
      ),
  );

  React.useEffect(() => {
    const url = new URL(window.location.href);
    window.history.replaceState(undefined, "", url);
  }, []);

  return (
    <React.StrictMode>
      <App
        language="english"
        location={urlLocation}
        onChangeUrl={(newUrl) => {
          window.history.replaceState(undefined, "", newUrl.toString());
          setUrlLocation(() =>
            simpleUrlToUrlLocation(
              urlToSimpleUrl(new URL(window.location.href)),
            )
          );
        }}
      />
    </React.StrictMode>
  );
};

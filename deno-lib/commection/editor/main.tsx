// definy RPC と同様にクライアントのコードを React で書く
// OGP 対応やGoogle検索のために SSR をする
import React from "https://esm.sh/react@18.2.0?pin=v135";
import { hydrateRoot } from "https://esm.sh/react-dom@18.2.0/client?pin=v135";
import { App } from "./app.tsx";
import { PageLocation, simpleUrlToPageLocation } from "./location.ts";
import { urlToSimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";
import { Language, languageFromId } from "../../zodType.ts";

/**
 * commection のエディターを動かす
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
  const [pageLocation, setPageLocation] = React.useState<
    PageLocation | undefined
  >(
    () =>
      simpleUrlToPageLocation(
        urlToSimpleUrl(new URL(window.location.href)),
      ),
  );
  const [language, setLanguage] = React.useState<Language>(() =>
    languageFromId(new URL(window.location.href).searchParams.get("hl"))
  );

  React.useEffect(() => {
    const url = new URL(window.location.href);
    window.history.replaceState(undefined, "", url);
  }, []);

  return (
    <React.StrictMode>
      <App
        language={language}
        location={pageLocation}
        onChangeUrl={(newUrl) => {
          window.history.replaceState(undefined, "", newUrl.toString());
          setPageLocation(() =>
            simpleUrlToPageLocation(
              urlToSimpleUrl(new URL(window.location.href)),
            )
          );
        }}
      />
    </React.StrictMode>
  );
};

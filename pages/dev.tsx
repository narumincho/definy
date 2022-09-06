import * as React from "react";
import { Button } from "../client/ui/Button";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";
import { useMutation } from "react-query";

const DevPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const requestToDesktop = useMutation(
    async (url: URL) => {
      const result = await fetch(url, {
        method: "POST",
        body: "bodyだよー",
      });
      return result.text();
    },
    {
      onSuccess: (data) => {
        console.log(data);
      },
    }
  );
  const [desktopUrlRaw, setDesktopUrlRaw] = React.useState<string>("");
  const desktopUrl = textToUrl(desktopUrlRaw);

  return (
    <WithHeader
      title={{
        japanese: "開発用ページ",
        english: "development page",
        esperanto: "disvolva paĝo",
      }}
      language={language}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
      location={{ type: "dev" }}
    >
      <div css={{ margin: 16 }}>
        <h1 css={{ margin: 0 }}>
          <Text
            language={language}
            japanese="開発用ページ"
            english="development page"
            esperanto="disvolva paĝo"
          />
        </h1>
        <OneLineTextEditor
          value={desktopUrlRaw}
          onChange={(e) => {
            setDesktopUrlRaw(e);
          }}
          id="desktop-url"
        />
        <Button
          onClick={
            desktopUrl === undefined || requestToDesktop.isLoading
              ? undefined
              : () => {
                  requestToDesktop.mutate(desktopUrl);
                }
          }
        >
          デスクトップアプリと通信する
        </Button>
        {requestToDesktop.isError ? "接続できなかった" : ""}
        {requestToDesktop.data}
      </div>
    </WithHeader>
  );
};

const textToUrl = (text: string): URL | undefined => {
  try {
    return new URL(text);
  } catch {
    return undefined;
  }
};

export default DevPage;

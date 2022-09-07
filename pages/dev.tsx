import * as React from "react";
import { Button } from "../client/ui/Button";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";
import { useMutation } from "react-query";

type DataFromDesktop =
  | {
      readonly type: "connection-error";
    }
  | {
      readonly type: "ok";
      readonly envs: ReadonlyMap<string, string>;
    };

const getDataFromDesktop = async (url: URL): Promise<DataFromDesktop> => {
  try {
    url.pathname = "/envs";
    const result = await fetch(url);
    const response: unknown = await result.json();
    if (typeof response === "string" || typeof response === "number") {
      return {
        type: "connection-error",
      };
    }
    return {
      type: "ok",
      envs: new Map(Object.entries(response as object)),
    };
  } catch (e) {
    console.log(e);
    return {
      type: "connection-error",
    };
  }
};

const DevPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const requestToDesktop = useMutation(getDataFromDesktop, {
    onSuccess: (data) => {
      console.log(data);
    },
  });
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
        <a
          href="https://narumincho.notion.site/definy-a0c64d59bf01408db879f25d9588a29d"
          css={{ color: "skyblue" }}
        >
          デスクトップアプリのダウンロードはこちら
        </a>
        <label>
          <div>URL</div>
          <OneLineTextEditor
            value={desktopUrlRaw}
            onChange={(e) => {
              setDesktopUrlRaw(e);
            }}
            id="desktop-url"
            placeholder="http://[::1]:2520/?token=Y6sABu7um1zFKed3QqHGAvRMZyp90s"
          />
        </label>
        {desktopUrl.type === "needToken"
          ? "URLには token が必要です 例: http://[::1]:2520/?token=Y6sABu7um1zFKed3QqHGAvRMZyp90s"
          : ""}
        {desktopUrl.type === "notUrl" ? "URLではありません" : ""}
        <Button
          onClick={
            desktopUrl.type !== "ok" || requestToDesktop.isLoading
              ? undefined
              : () => {
                  requestToDesktop.mutate(desktopUrl.url);
                }
          }
        >
          デスクトップアプリと通信する
        </Button>
        {requestToDesktop.data?.type === "connection-error"
          ? "接続ができなかったか, 指定を間違えた"
          : ""}
        <div
          css={{
            overflow: "scroll",
            height: 400,
            width: 620,
          }}
        >
          {requestToDesktop.data?.type === "ok" ? (
            [...requestToDesktop.data.envs].map(([k, v]) => (
              <div
                key={k}
                css={{
                  display: "grid",
                  gridAutoFlow: "column",
                  padding: 8,
                  width: "100%",
                  gap: 8,
                }}
              >
                <div css={{ overflowWrap: "break-word" }}>{k}</div>
                <div css={{ overflowWrap: "break-word" }}>{v}</div>
              </div>
            ))
          ) : (
            <></>
          )}
        </div>
      </div>
    </WithHeader>
  );
};

const textToUrl = (
  text: string
): { type: "ok"; url: URL } | { type: "notUrl" } | { type: "needToken" } => {
  try {
    const url = new URL(text);
    const token = url.searchParams.get("token");
    if (token === null || token === "") {
      return { type: "needToken" };
    }
    return { type: "ok", url: new URL(text) };
  } catch {
    return { type: "notUrl" };
  }
};

export default DevPage;

import * as React from "react";
import * as zodType from "../common/zodType";
import { Header, TitleItem } from "./Header";
import Head from "next/head";
import { LoadingBoxCenter } from "./LoadingBox";
import type { TextProps } from "./Text";
import { UseAccountTokenResult } from "../hooks/useAccountToken";
import iconPng from "../assets/icon.png";
import { trpc } from "../hooks/trpc";
import { useRouter } from "next/router";
import { zodLanguageToQueryValue } from "../common/url";

export const WithHeader = (props: {
  readonly titleItemList: ReadonlyArray<TitleItem>;
  /** ログインした先のページ場所 */
  readonly location: zodType.Location | undefined;
  readonly language: zodType.Language;
  readonly children: React.ReactNode;
  readonly title: TextProps;
  readonly useAccountTokenResult: UseAccountTokenResult;
}): React.ReactElement => {
  const requestLogInUrl = trpc.useMutation("requestLogInUrl");
  const { push: routerPush } = useRouter();

  React.useEffect(() => {
    if (requestLogInUrl.isSuccess) {
      routerPush(new URL(requestLogInUrl.data));
    }
  }, [requestLogInUrl.isSuccess, routerPush, requestLogInUrl.data]);

  return (
    <>
      <Head>
        <title>{titleMessage(props.title[props.language])}</title>
        <link rel="icon" type="image/png" href={iconPng.src} />
      </Head>
      <div
        css={{
          width: "100%",
          height: "100%",
          display: "grid",
          overflow: "hidden",
          gridTemplateRows: "48px 1fr",
          backgroundColor: "#222",
        }}
        lang={zodLanguageToQueryValue(props.language)}
      >
        <Header
          location={props.location}
          language={props.language}
          titleItemList={[]}
          onLogInButtonClick={() => {
            if (props.location?.type === "tools") {
              requestLogInUrl.mutate({
                location: { type: "tools" },
                language: props.language,
              });
              return;
            }
            requestLogInUrl.mutate({
              location: { type: "home" },
              language: props.language,
            });
          }}
          useAccountTokenResult={props.useAccountTokenResult}
        />
        <div
          css={{
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
            color: "white",
          }}
        >
          {requestLogInUrl.status === "idle" ? props.children : <></>}
          {requestLogInUrl.status === "loading" ? (
            <LoadingBoxCenter message={logInMessage(props.language)} />
          ) : (
            <></>
          )}
          {requestLogInUrl.status === "success" ? (
            <LoadingBoxCenter message={jumpMessage(props.language)} />
          ) : (
            <></>
          )}
        </div>
      </div>
    </>
  );
};

const titleMessage = (message: string): string => {
  if (message === "") {
    return "definy";
  }
  return message + " | definy";
};

const logInMessage = (language: zodType.Language): string => {
  switch (language) {
    case "english":
      return `Preparing to log in to Google`;
    case "esperanto":
      return `Preparante ensaluti al Google`;
    case "japanese":
      return `Google へのログインを準備中……`;
  }
};

const jumpMessage = (language: zodType.Language): string => {
  switch (language) {
    case "english":
      return `Navigating to Google logIn page.`;
    case "esperanto":
      return `Navigado al Google-ensaluta paĝo.`;
    case "japanese":
      return `Google のログインページへ移動中……`;
  }
};

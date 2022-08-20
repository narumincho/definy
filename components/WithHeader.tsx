import * as React from "react";
import * as d from "../localData";
import { Header, TitleItem } from "./Header";
import Head from "next/head";
import { Language } from "../common/zodType";
import { LoadingBoxCenter } from "./LoadingBox";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { dataLanguageToQueryValue } from "../common/url";
import iconPng from "../assets/icon.png";
import { trpc } from "../hooks/trpc";
import { useRouter } from "next/router";

export const WithHeader = (
  props: Pick<UseDefinyAppResult, "logInState"> & {
    readonly titleItemList: ReadonlyArray<TitleItem>;
    readonly location: d.Location;
    readonly language: d.Language;
    readonly children: React.ReactNode;
    readonly title: string;
  }
): React.ReactElement => {
  const requestLogInUrl = trpc.useMutation("requestLogInUrl");
  const router = useRouter();

  React.useEffect(() => {
    if (requestLogInUrl.isSuccess) {
      router.push(new URL(requestLogInUrl.data));
    }
  }, [requestLogInUrl.isSuccess, router, requestLogInUrl.data]);

  return (
    <>
      <Head>
        <title>{titleMessage(props.title)}</title>
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
        lang={dataLanguageToQueryValue(props.language)}
      >
        <Header
          logInState={props.logInState}
          locationAndLanguage={{
            location: props.location,
            language: props.language,
          }}
          titleItemList={[]}
          onLogInButtonClick={() => {
            if (props.location._ === "ToolList") {
              requestLogInUrl.mutate({
                location: { type: "tools" },
                language: dataLanguageToZodLanguage(props.language),
              });
              return;
            }
            requestLogInUrl.mutate({
              location: { type: "home" },
              language: dataLanguageToZodLanguage(props.language),
            });
          }}
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

const appName = "definy NI 版";

const titleMessage = (message: string): string => {
  if (message === "") {
    return appName;
  }
  return message + " | " + appName;
};

const dataLanguageToZodLanguage = (language: d.Language): Language => {
  switch (language) {
    case "English":
      return "english";
    case "Japanese":
      return "japanese";
    case "Esperanto":
      return "esperanto";
  }
};

const logInMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to Google`;
    case "Esperanto":
      return `Preparante ensaluti al Google`;
    case "Japanese":
      return `Google へのログインを準備中……`;
  }
};

const jumpMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to Google logIn page.`;
    case "Esperanto":
      return `Navigado al Google-ensaluta paĝo.`;
    case "Japanese":
      return `Google のログインページへ移動中……`;
  }
};

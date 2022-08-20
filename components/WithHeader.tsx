import * as React from "react";
import * as d from "../localData";
import { Header, TitleItem } from "./Header";
import Head from "next/head";
import { Language } from "../common/zodType";
import { LogInMessage } from "./LogInMessage";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import iconPng from "../assets/icon.png";
import { trpc } from "../hooks/trpc";

export const WithHeader = (
  props: Pick<UseDefinyAppResult, "accountResource" | "logInState"> & {
    readonly titleItemList: ReadonlyArray<TitleItem>;
    readonly location: d.Location;
    readonly language: d.Language;
    readonly children: React.ReactNode;
    readonly title: string;
  }
): React.ReactElement => {
  const requestLogInUrl = trpc.useMutation("requestLogInUrl");

  React.useEffect(() => {
    if (requestLogInUrl.isSuccess) {
      console.log("requestLogInUrl response", requestLogInUrl.data);
    }
  }, [requestLogInUrl.isSuccess, requestLogInUrl.data]);

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
      >
        <Header
          logInState={props.logInState}
          accountResource={props.accountResource}
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
        <LogInMessage logInState={props.logInState} language={props.language} />
        <div
          css={{
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
          }}
        >
          {requestLogInUrl.isLoading ? <></> : props.children}
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

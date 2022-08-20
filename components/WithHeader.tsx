import * as React from "react";
import { Header, TitleItem } from "./Header";
import { Language, Location } from "../localData";
import Head from "next/head";
import { LogInMessage } from "./LogInMessage";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import iconPng from "../assets/icon.png";

export const WithHeader = (
  props: Pick<
    UseDefinyAppResult,
    "accountResource" | "logInState" | "logIn"
  > & {
    readonly titleItemList: ReadonlyArray<TitleItem>;
    readonly location: Location;
    readonly language: Language;
    readonly children: React.ReactNode;
    readonly title: string;
  }
): React.ReactElement => {
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
          onLogInButtonClick={props.logIn}
        />
        <LogInMessage logInState={props.logInState} language={props.language} />
        <div
          css={{
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
          }}
        >
          {props.children}
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

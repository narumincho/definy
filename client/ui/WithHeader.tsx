import * as React from "react";
import { Header, TitleItem } from "./Header";
import { Language, Location } from "../../localData";
import { LogInMessage } from "../../components/LogInMessage";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export const WithHeader = (
  props: Pick<
    UseDefinyAppResult,
    "accountResource" | "logInState" | "logIn"
  > & {
    readonly titleItemList: ReadonlyArray<TitleItem>;
    readonly location: Location;
    readonly language: Language;
    readonly children: React.ReactNode;
  }
): React.ReactElement => {
  return (
    <div
      className={css({
        width: "100%",
        height: "100%",
        display: "grid",
        overflow: "hidden",
        gridTemplateRows: "48px 1fr",
        backgroundColor: "#222",
      })}
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
        className={css({
          gridColumn: "1 / 2",
          gridRow: "2 / 3",
        })}
      >
        {props.children}
      </div>
    </div>
  );
};

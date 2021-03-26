import * as React from "react";
import * as d from "../../data";
import { css, keyframes } from "@emotion/css";
import { AboutPage } from "./AboutPage";
import { HomePage } from "./HomePage";
import { SettingPage } from "./SettingPage";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type Props = {
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
  location: d.Location;
  language: d.Language;
  logInState: d.LogInState;
  accountDict: ReadonlyMap<d.AccountId, d.Account>;
  onJump: (urlData: d.UrlData) => void;
  onLogInButtonClick: () => void;
  onLogOutButtonClick: () => void;
};

export const App: React.VFC<Props> = (props) => {
  switch (props.logInState._) {
    case "RequestingLogInUrl": {
      return (
        <PrepareLogIn
          message={logInMessage(
            props.logInState.openIdConnectProvider,
            props.language
          )}
        />
      );
    }
    case "JumpingToLogInPage": {
      return <PrepareLogIn message={jumpMessage(props.language)} />;
    }
  }
  switch (props.location._) {
    case "About":
      return (
        <AboutPage
          accountDict={props.accountDict}
          language={props.language}
          logInState={props.logInState}
          onJump={props.onJump}
          onLogInButtonClick={props.onLogInButtonClick}
        />
      );
    case "Setting":
      return (
        <SettingPage
          accountDict={props.accountDict}
          language={props.language}
          logInState={props.logInState}
          onJump={props.onJump}
          onClickLogoutButton={props.onLogOutButtonClick}
        />
      );
  }
  return (
    <HomePage
      topProjectsLoadingState={props.topProjectsLoadingState}
      projectDict={props.projectDict}
      accountDict={props.accountDict}
      language={props.language}
      logInState={props.logInState}
      onJump={props.onJump}
      onLogInButtonClick={props.onLogInButtonClick}
    />
  );
};

const PrepareLogIn: React.VFC<{ message: string }> = (props) => (
  <div
    className={css({
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    })}
  >
    <LoadingBox message={props.message} />
  </div>
);

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to ${provider}`;
    case "Esperanto":
      return `Preparante ensaluti al Google${provider}`;
    case "Japanese":
      return `${provider}へのログインを準備中……`;
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

const LoadingBox: React.VFC<{ message: string }> = (props) => (
  <div
    className={css({
      display: "grid",
      overflow: "hidden",
      justifyItems: "center",
    })}
  >
    <div>{props.message}</div>
    <div
      className={css({
        width: 128,
        height: 128,
        display: "grid",
        justifyItems: "center",
        alignItems: "center",
        borderRadius: "50%",
        animation: `3s ${rotateAnimation} infinite linear`,
        fontSize: 24,
        padding: 8,
        backgroundColor: "#333",
        color: "#ddd",
        fontFamily: "Hack",
      })}
    >
      Definy
    </div>
  </div>
);

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;

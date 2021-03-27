import * as React from "react";
import * as d from "../../data";
import { css, keyframes } from "@emotion/css";
import { AboutPage } from "./AboutPage";
import { CreateProjectPage } from "./CreateProjectPage";
import { Header } from "./Header";
import { HomePage } from "./HomePage";
import { SettingPage } from "./SettingPage";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type CreateProjectState =
  | {
      _: "creating";
      name: string;
    }
  | {
      _: "none";
    };
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
  onCreateProject: (projectName: string) => void;
  createProjectState: CreateProjectState;
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
  return (
    <div
      className={css({
        height: "100%",
        display: "grid",
        overflow: "hidden",
        gridTemplateRows: "48px 1fr",
        backgroundColor: "#222",
      })}
    >
      <Header
        logInState={props.logInState}
        accountDict={props.accountDict}
        language={props.language}
        titleItemList={[]}
        onJump={props.onJump}
        onLogInButtonClick={props.onLogInButtonClick}
      />
      <AppMain {...props} />
    </div>
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

/**
 * Header を含まない部分
 */
const AppMain: React.VFC<Props> = (props) => {
  switch (props.location._) {
    case "About":
      return <AboutPage language={props.language} />;
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
    case "CreateProject":
      return (
        <CreateProjectPage
          createProjectState={props.createProjectState}
          onCreateProject={props.onCreateProject}
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
    />
  );
};

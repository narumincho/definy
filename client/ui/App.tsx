import * as React from "react";
import * as d from "../../data";
import { css, keyframes } from "@emotion/css";
import { AboutPage } from "./AboutPage";
import { AccountPage } from "./AccountPage";
import { CreateProjectPage } from "./CreateProjectPage";
import { Header } from "./Header";
import { HomePage } from "./HomePage";
import { ProjectPage } from "./ProjectPage";
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
  readonly topProjectsLoadingState: TopProjectsLoadingState;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly location: d.Location;
  readonly language: d.Language;
  readonly logInState: d.LogInState;
  readonly createProjectState: CreateProjectState;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onLogInButtonClick: () => void;
  readonly onLogOutButtonClick: () => void;
  readonly onCreateProject: (projectName: string) => void;
  readonly onRequestProjectById: (projectId: d.ProjectId) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
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
        getAccount={props.getAccount}
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
          getAccount={props.getAccount}
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
    case "Project":
      return (
        <ProjectPage
          language={props.language}
          onJump={props.onJump}
          projectId={props.location.projectId}
          getProject={props.getProject}
          getAccount={props.getAccount}
          onRequestProjectById={props.onRequestProjectById}
          onRequestAccount={props.onRequestAccount}
        />
      );
    case "Account":
      return (
        <AccountPage
          language={props.language}
          onJump={props.onJump}
          accountId={props.location.accountId}
          getAccount={props.getAccount}
          getProject={props.getProject}
          onRequestAccount={props.onRequestAccount}
          onRequestProject={props.onRequestProjectById}
        />
      );
  }
  return (
    <HomePage
      topProjectsLoadingState={props.topProjectsLoadingState}
      getAccount={props.getAccount}
      language={props.language}
      logInState={props.logInState}
      getProject={props.getProject}
      onJump={props.onJump}
      onRequestProjectById={props.onRequestProjectById}
    />
  );
};

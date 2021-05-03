import * as React from "react";
import * as d from "../../data";
import { Header, TitleItem } from "./Header";
import { css, keyframes } from "@emotion/css";
import { AboutPage } from "./AboutPage";
import { AccountPage } from "./AccountPage";
import { CreateProjectPage } from "./CreateProjectPage";
import { HomePage } from "./HomePage";
import { ProjectPage } from "./ProjectPage";
import { SettingPage } from "./SettingPage";
import { TypePartPage } from "./TypePartPage";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = {
  readonly useDefinyAppResult: UseDefinyAppResult;
};

const titleItemList: ReadonlyArray<TitleItem> = [];

export const App: React.VFC<Props> = ({ useDefinyAppResult }) => {
  switch (useDefinyAppResult.logInState._) {
    case "RequestingLogInUrl": {
      return (
        <PrepareLogIn
          message={logInMessage(
            useDefinyAppResult.logInState.openIdConnectProvider,
            useDefinyAppResult.language
          )}
        />
      );
    }
    case "JumpingToLogInPage": {
      return (
        <PrepareLogIn message={jumpMessage(useDefinyAppResult.language)} />
      );
    }
  }
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
        logInState={useDefinyAppResult.logInState}
        accountResource={useDefinyAppResult.accountResource}
        language={useDefinyAppResult.language}
        titleItemList={titleItemList}
        onJump={useDefinyAppResult.jump}
        onLogInButtonClick={useDefinyAppResult.logIn}
      />
      <AppMain useDefinyAppResult={useDefinyAppResult} />
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
  const useDefinyAppResult = props.useDefinyAppResult;
  switch (useDefinyAppResult.location._) {
    case "About":
      return <AboutPage language={useDefinyAppResult.language} />;
    case "Setting":
      return (
        <SettingPage
          accountResource={useDefinyAppResult.accountResource}
          language={useDefinyAppResult.language}
          logInState={useDefinyAppResult.logInState}
          onJump={useDefinyAppResult.jump}
          onLogOut={useDefinyAppResult.logOut}
        />
      );
    case "CreateProject":
      return (
        <CreateProjectPage
          createProjectState={useDefinyAppResult.createProjectState}
          onCreateProject={useDefinyAppResult.createProject}
        />
      );
    case "Project":
      return (
        <ProjectPage
          language={useDefinyAppResult.language}
          onJump={useDefinyAppResult.jump}
          projectId={useDefinyAppResult.location.projectId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          addTypePart={useDefinyAppResult.addTypePart}
          typePartIdListInProjectResource={
            useDefinyAppResult.typePartIdListInProjectResource
          }
          typePartResource={useDefinyAppResult.typePartResource}
        />
      );
    case "Account":
      return (
        <AccountPage
          language={useDefinyAppResult.language}
          onJump={useDefinyAppResult.jump}
          accountId={useDefinyAppResult.location.accountId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          typePartResource={useDefinyAppResult.typePartResource}
        />
      );
    case "TypePart":
      return (
        <TypePartPage
          typePartResource={useDefinyAppResult.typePartResource}
          typePartId={useDefinyAppResult.location.typePartId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          language={useDefinyAppResult.language}
          onJump={useDefinyAppResult.jump}
          typePartIdListInProjectResource={
            useDefinyAppResult.typePartIdListInProjectResource
          }
          saveTypePart={useDefinyAppResult.saveTypePart}
          isSavingTypePart={useDefinyAppResult.isSavingTypePart}
        />
      );
  }
  return (
    <HomePage
      topProjectsLoadingState={useDefinyAppResult.topProjectsLoadingState}
      accountResource={useDefinyAppResult.accountResource}
      language={useDefinyAppResult.language}
      logInState={useDefinyAppResult.logInState}
      projectResource={useDefinyAppResult.projectResource}
      onJump={useDefinyAppResult.jump}
      requestTop50Project={useDefinyAppResult.requestTop50Project}
      typePartResource={useDefinyAppResult.typePartResource}
    />
  );
};

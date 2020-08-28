import * as React from "react";
import * as d from "definy-core/source/data";
import { Init, Model, useModel } from "./model";
import { About as AboutPage } from "./Page/About";
import { Commit as CommitPage } from "./Page/Commit";
import { CreateProject as CreateProjectPage } from "./Page/CreateProject";
import { Debug } from "./Page/Debug";
import { Header } from "./Header";
import { Home as HomePage } from "./Page/Home";
import { LoadingBox } from "./ui";
import { Project as ProjectPage } from "./Page/Project";
import { Setting as SettingPage } from "./Page/Setting";
import { User as UserPage } from "./Page/User";
import styled from "styled-components";

export const App: React.FC<Init> = (prop) => {
  const model = useModel(prop);

  switch (model.logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return (
        <RequestingLogInUrl
          message={logInMessage(
            model.logInState.openIdConnectProvider,
            model.language
          )}
        />
      );
    case "JumpingToLogInPage":
      return (
        <RequestingLogInUrl
          message={jumpMessage(
            new URL(model.logInState.string),
            model.language
          )}
        />
      );
  }
  return (
    <NormalStyledDiv>
      <Header key="side" model={model} />
      <MainPanel location={model.location} model={model} />
    </NormalStyledDiv>
  );
};

const NormalStyledDiv = styled.div({
  height: "100%",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});

const LogInViewStyledDiv = styled.div({
  height: "100%",
  display: "grid",
  alignItems: "center",
  justifyItems: "center",
});

const RequestingLogInUrl: React.FC<{
  message: string;
}> = (prop) => (
  <LogInViewStyledDiv>
    <LoadingBox>{prop.message}</LoadingBox>
  </LogInViewStyledDiv>
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

const jumpMessage = (url: URL, language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const MainPanel: React.FC<{
  model: Model;
  location: d.Location;
}> = (prop) => {
  switch (prop.location._) {
    case "Home":
      return <HomePage model={prop.model} />;
    case "CreateProject":
      return <CreateProjectPage model={prop.model} />;
    case "Project":
      return (
        <ProjectPage
          model={prop.model}
          page={{ _: "Project", projectId: prop.location.projectId }}
        />
      );
    case "User":
      return <UserPage model={prop.model} userId={prop.location.userId} />;
    case "Idea":
      return (
        <ProjectPage
          model={prop.model}
          page={{ _: "Idea", ideaId: prop.location.ideaId }}
        />
      );
    case "Commit":
      return (
        <CommitPage commitId={prop.location.commitId} model={prop.model} />
      );
    case "Setting":
      return <SettingPage model={prop.model} />;
    case "About":
      return <AboutPage />;
    case "Debug":
      return <Debug />;
    default:
      return <div>他のページは準備中</div>;
  }
};

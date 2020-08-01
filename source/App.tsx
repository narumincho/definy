import * as React from "react";
import * as api from "./api";
import * as core from "definy-core";
import * as indexedDB from "./indexedDB";
import * as resourceAllProjectIdList from "./resource";
import {
  AccessToken,
  Language,
  Location,
  LogInState,
  Maybe,
  OpenIdConnectProvider,
  Resource,
  UrlData,
  User,
  UserId,
} from "definy-core/source/data";
import { CreateProjectState, Model } from "./model";
import { About as AboutPage } from "./Page/About";
import { Commit as CommitPage } from "./Page/Commit";
import { CreateProject as CreateProjectPage } from "./Page/CreateProject";
import { Debug } from "./Page/Debug";
import { Home as HomePage } from "./Page/Home";
import { LoadingBox } from "./ui";
import { Project as ProjectPage } from "./Page/Project";
import { Setting as SettingPage } from "./Page/Setting";
import { SidePanel } from "./SidePanel";
import { User as UserPage } from "./Page/User";
import styled from "styled-components";

export const App: React.FC<{
  accessToken: Maybe<AccessToken>;
  initUrlData: UrlData;
}> = (prop) => {
  const [urlData, onJump] = React.useState<UrlData>(prop.initUrlData);
  const [logInState, setLogInState] = React.useState<LogInState>(
    prop.accessToken._ === "Just"
      ? LogInState.WaitVerifyingAccessToken(prop.accessToken.value)
      : LogInState.WaitLoadingAccessTokenFromIndexedDB
  );
  const [createProjectState, setCreateProjectState] = React.useState<
    CreateProjectState
  >({ _: "None" });

  const [isLogOutRequest, setIsLogOutRequest] = React.useState<boolean>(false);

  const {
    allProjectIdListMaybe,
    projectMap,
    userMap,
    imageMap,
    requestAllProject,
    requestProject,
    requestUser,
    setUser,
    requestImage,
  } = resourceAllProjectIdList.useProjectAllIdList();

  // ルーティング
  React.useEffect(() => {
    window.history.pushState(
      undefined,
      "",
      core.urlDataAndAccessTokenToUrl(urlData, Maybe.Nothing()).toString()
    );
    window.addEventListener("popstate", () => {
      onJump(
        core.urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
  }, [urlData]);

  // ログイン
  React.useEffect(logInEffect(logInState, urlData, setLogInState, setUser), [
    logInState,
  ]);

  React.useEffect(() => {
    switch (createProjectState._) {
      case "None":
        return;
      case "WaitCreating":
        if (logInState._ === "LoggedIn")
          api
            .createProject({
              accessToken: logInState.accessTokenAndUserId.accessToken,
              projectName: createProjectState.projectName,
            })
            .then((projectMaybe) => {
              if (projectMaybe._ === "Just") {
                setCreateProjectState({
                  _: "Created",
                  projectId: projectMaybe.value.id,
                });
              } else {
                console.log("プロジェクト作成に失敗");
              }
            });
    }
  }, [createProjectState]);

  React.useEffect(() => {
    if (isLogOutRequest) {
      setIsLogOutRequest(false);
      indexedDB.deleteAccessToken().then(() => {
        setLogInState(LogInState.Guest);
      });
    }
  }, [isLogOutRequest]);

  const model: Model = {
    clientMode: urlData.clientMode,
    language: urlData.language,
    logInState,
    projectMap,
    userMap,
    imageMap,
    createProjectState,
    onJump,
    allProjectIdListMaybe,
    requestAllProject,
    requestProject,
    requestUser,
    requestImage,
    createProject: (projectName) => {
      setCreateProjectState({ _: "WaitCreating", projectName });
    },
    requestLogOut: () => {
      setIsLogOutRequest(true);
    },
  };

  switch (logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return (
        <RequestingLogInUrl
          message={logInMessage(
            logInState.openIdConnectProvider,
            urlData.language
          )}
        />
      );
    case "JumpingToLogInPage":
      return (
        <RequestingLogInUrl
          message={jumpMessage(new URL(logInState.string), urlData.language)}
        />
      );
  }
  return (
    <NormalStyledDiv>
      <SidePanel
        key="side"
        model={model}
        onRequestLogIn={(provider) => {
          setLogInState(LogInState.WaitRequestingLogInUrl(provider));
        }}
      />
      <MainPanel location={urlData.location} model={model} />
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
  provider: OpenIdConnectProvider,
  language: Language
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

const jumpMessage = (url: URL, language: Language): string => {
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
  location: Location;
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

const logInEffect = (
  logInState: LogInState,
  urlData: UrlData,
  dispatchLogInState: React.Dispatch<React.SetStateAction<LogInState>>,
  setUser: (userId: UserId, userResource: Resource<User>) => void
): React.EffectCallback => () => {
  switch (logInState._) {
    case "WaitLoadingAccessTokenFromIndexedDB":
      dispatchLogInState(LogInState.LoadingAccessTokenFromIndexedDB);
      indexedDB.getAccessToken().then((accessToken) => {
        if (accessToken === undefined) {
          dispatchLogInState(LogInState.Guest);
        } else {
          dispatchLogInState(LogInState.WaitVerifyingAccessToken(accessToken));
        }
      });
      return;
    case "Guest":
      return;
    case "WaitRequestingLogInUrl":
      dispatchLogInState(
        LogInState.RequestingLogInUrl(logInState.openIdConnectProvider)
      );
      api
        .requestLogInUrl({
          openIdConnectProvider: logInState.openIdConnectProvider,
          urlData,
        })
        .then((logInUrl) => {
          dispatchLogInState(LogInState.JumpingToLogInPage(logInUrl));
        });
      return;
    case "JumpingToLogInPage":
      window.location.href = logInState.string;
      return;
    case "WaitVerifyingAccessToken":
      dispatchLogInState({
        _: "VerifyingAccessToken",
        accessToken: logInState.accessToken,
      });
      api
        .getUserByAccessToken(logInState.accessToken)
        .then((userResourceAndIdMaybe) => {
          switch (userResourceAndIdMaybe._) {
            case "Just":
              indexedDB.setAccessToken(logInState.accessToken);
              dispatchLogInState(
                LogInState.LoggedIn({
                  accessToken: logInState.accessToken,
                  userId: userResourceAndIdMaybe.value.id,
                })
              );
              setUser(
                userResourceAndIdMaybe.value.id,
                userResourceAndIdMaybe.value.data
              );
              return;
            case "Nothing":
              dispatchLogInState(LogInState.Guest);
          }
        });
  }
};

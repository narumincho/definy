/** @jsx jsx */

import * as React from "react";
import { LogInState, Model } from "./model";
import { RequestState, Resource, Response, ResponseData } from "./data";
import {
  data,
  urlDataAndAccessTokenFromUrl,
  urlDataAndAccessTokenToUrl,
} from "definy-common";
import { About } from "./About";
import { Debug } from "./Debug";
import { Home } from "./Home";
import { LoadingBox } from "./ui";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: data.Codec<responseType>
): Promise<responseType> =>
  fetch(`https://us-central1-definy-lang.cloudfunctions.net/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

type ProjectDataAction =
  | {
      _: "ResponseAllProjectList";
      list: ReadonlyArray<data.IdAndData<data.ProjectId, data.Project>>;
    }
  | { _: "ResponseProject"; response: Response<data.ProjectId, data.Project> };

type UserDataAction = {
  _: "RespondUserData";
  response: Response<data.UserId, data.User>;
};

export const App: React.FC<{
  accessToken: data.Maybe<data.AccessToken>;
  initUrlData: data.UrlData;
}> = (prop) => {
  const [urlData, onJump] = React.useState<data.UrlData>(prop.initUrlData);
  const [logInState, dispatchLogInState] = React.useState<LogInState>(
    prop.accessToken._ === "Just"
      ? { _: "WaitVerifyingAccessToken", accessToken: prop.accessToken.value }
      : { _: "Guest" }
  );
  const [projectData, dispatchProject] = React.useReducer(
    (
      state: ReadonlyMap<data.ProjectId, Resource<data.Project>>,
      action: ProjectDataAction
    ): ReadonlyMap<data.ProjectId, Resource<data.Project>> => {
      switch (action._) {
        case "ResponseAllProjectList":
          return new Map(
            action.list.map((project) => [
              project.id,
              Resource.Loaded(project.data),
            ])
          );
        case "ResponseProject": {
          const newMap = new Map(state);
          newMap.set(
            action.response.id,
            action.response.data._ === "Found"
              ? Resource.Loaded(action.response.data.data)
              : Resource.NotFound()
          );
          return newMap;
        }
      }
    },
    new Map()
  );
  const [
    allProjectRequestState,
    dispatchAllProjectRequestState,
  ] = React.useState<RequestState>("NotRequest");

  const [userData, dispatchUserData] = React.useReducer(
    (
      state: ReadonlyMap<data.UserId, Resource<data.User>>,
      action: UserDataAction
    ): ReadonlyMap<data.UserId, Resource<data.User>> => {
      switch (action._) {
        case "RespondUserData": {
          const newSet = new Map(state);
          newSet.set(
            action.response.id,
            action.response.data._ === "Found"
              ? Resource.Loaded(action.response.data.data)
              : Resource.NotFound()
          );
          return newSet;
        }
      }
    },
    new Map()
  );

  React.useEffect(() => {
    window.history.pushState(
      undefined,
      "",
      urlDataAndAccessTokenToUrl(urlData, data.Maybe.Nothing()).toString()
    );
    window.addEventListener("popstate", () => {
      onJump(
        urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
  }, [urlData]);

  React.useEffect(
    logInEffect(logInState, urlData, dispatchLogInState, dispatchUserData),
    [logInState]
  );

  React.useEffect(() => {
    switch (allProjectRequestState) {
      case "NotRequest":
        return;
      case "WaitRequest":
        dispatchAllProjectRequestState("Requesting");
        callApi(
          "getAllProject",
          [],
          data.List.codec(
            data.IdAndData.codec(data.ProjectId.codec, data.Project.codec)
          )
        ).then((projectList) => {
          dispatchProject({
            _: "ResponseAllProjectList",
            list: projectList,
          });
          dispatchAllProjectRequestState("Respond");
        });
    }
  }, [allProjectRequestState]);

  const model: Model = {
    clientMode: urlData.clientMode,
    language: urlData.language,
    logInState,
    projectData,
    userData,
    onJump,
    allProjectRequestState,
    requestAllProject: () => {
      dispatchAllProjectRequestState("WaitRequest");
    },
  };

  switch (logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return (
        <RequestingLogInUrl
          message={logInMessage(logInState.provider, urlData.language)}
        />
      );
    case "JumpingToLogInPage":
      return (
        <RequestingLogInUrl
          message={jumpMessage(logInState.logInUrl, urlData.language)}
        />
      );
  }
  return (
    <div
      css={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
      }}
    >
      <SidePanel
        model={model}
        onRequestLogIn={(provider) => {
          dispatchLogInState({ _: "WaitRequestingLogInUrl", provider });
        }}
      />
      <MainPanel location={urlData.location} model={model} />
    </div>
  );
};

const RequestingLogInUrl: React.FC<{
  message: string;
}> = (prop) => (
  <div
    css={{
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    }}
  >
    <LoadingBox>{prop.message}</LoadingBox>
  </div>
);

const logInMessage = (
  provider: data.OpenIdConnectProvider,
  language: data.Language
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

const jumpMessage = (url: URL, language: data.Language) => {
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
  location: data.Location;
}> = (prop) => {
  switch (prop.location._) {
    case "Home":
      return <Home model={prop.model} />;
    case "About":
      return <About />;
    case "Debug":
      return <Debug />;
    default:
      return <div>他のページは準備中</div>;
  }
};

const logInEffect = (
  logInState: LogInState,
  urlData: data.UrlData,
  dispatchLogInState: React.Dispatch<React.SetStateAction<LogInState>>,
  dispatchUserData: React.Dispatch<UserDataAction>
): React.EffectCallback => () => {
  switch (logInState._) {
    case "Guest":
      return;
    case "WaitRequestingLogInUrl":
      dispatchLogInState({
        _: "RequestingLogInUrl",
        provider: logInState.provider,
      });
      callApi(
        "requestLogInUrl",
        data.RequestLogInUrlRequestData.codec.encode({
          openIdConnectProvider: logInState.provider,
          urlData,
        }),
        data.String.codec
      ).then((logInUrl) => {
        dispatchLogInState({
          _: "JumpingToLogInPage",
          logInUrl: new URL(logInUrl),
        });
      });
      return;
    case "JumpingToLogInPage":
      window.location.href = logInState.logInUrl.toString();
      return;
    case "WaitVerifyingAccessToken":
      dispatchLogInState({
        _: "VerifyingAccessToken",
        accessToken: logInState.accessToken,
      });
      callApi(
        "getUserByAccessToken",
        data.AccessToken.codec.encode(logInState.accessToken),
        data.IdAndData.codec(data.UserId.codec, data.User.codec)
      ).then((userSnapshotAndId) => {
        dispatchLogInState({
          _: "LoggedIn",
          accessToken: logInState.accessToken,
          userId: userSnapshotAndId.id,
        });
        dispatchUserData({
          _: "RespondUserData",
          response: {
            id: userSnapshotAndId.id,
            data: ResponseData.Found(userSnapshotAndId.data),
          },
        });
      });
  }
};

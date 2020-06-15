/** @jsx jsx */

import * as React from "react";
import {
  Codec,
  Language,
  List,
  Location,
  Maybe,
  OpenIdConnectProvider,
  ProjectResponse,
  ProjectSnapshotAndId,
  RequestLogInUrlRequestData,
  String,
  UrlData,
} from "definy-common/source/data";
import { LogInState, Model, ProjectData } from "./model";
import {
  urlDataAndAccessTokenFromUrl,
  urlDataAndAccessTokenToUrl,
} from "definy-common";
import { About } from "./About";
import { Home } from "./Home";
import { LoadingBox } from "./ui";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";

const getWindowDimensions = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = React.useState(
    getWindowDimensions()
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(getWindowDimensions());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
};

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: Codec<responseType>
): Promise<responseType> =>
  fetch(`https://us-central1-definy-lang.cloudfunctions.net/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

type Action =
  | {
      _: "ResponseAllProjectList";
      list: ReadonlyArray<ProjectSnapshotAndId>;
    }
  | { _: "ResponseProject"; response: ProjectResponse };

export const App: React.FC<{ initUrlData: UrlData }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [urlData, onJump] = React.useState<UrlData>(prop.initUrlData);
  const [logInState, dispatchLogInState] = React.useReducer(
    (
      state: LogInState,
      action:
        | { _: "RequestLogInUrl"; provider: OpenIdConnectProvider }
        | { _: "RequestedLogInUrl" }
        | { _: "RespondLogInUrl"; url: URL }
    ): LogInState => {
      switch (action._) {
        case "RequestLogInUrl":
          return { _: "PreparingLogInUrlRequest", provider: action.provider };
        case "RequestedLogInUrl":
          if (state._ === "PreparingLogInUrlRequest") {
            return { _: "RequestingLogInUrl", provider: state.provider };
          }
          return state;
        case "RespondLogInUrl":
          return { _: "JumpingToLogInPage", logInUrl: action.url };
      }
    },
    {
      _: "Guest",
    }
  );
  const [projectData, dispatchProject] = React.useReducer(
    (state: ProjectData, action: Action): ProjectData => {
      switch (action._) {
        case "ResponseAllProjectList":
          return new Map(
            action.list.map((project) => [
              project.id,
              { _: "Loaded", snapshot: project.snapshot },
            ])
          );
        case "ResponseProject": {
          const newMap = new Map(state);
          newMap.set(
            action.response.id,
            action.response.snapshotMaybe._ === "Just"
              ? { _: "Loaded", snapshot: action.response.snapshotMaybe.value }
              : { _: "NotFound" }
          );
          return newMap;
        }
      }
    },
    new Map()
  );

  React.useEffect(() => {
    history.pushState(
      undefined,
      "",
      urlDataAndAccessTokenToUrl(urlData, Maybe.Nothing()).toString()
    );
  }, [urlData]);
  React.useEffect(() => {
    addEventListener("popstate", () => {
      onJump(
        urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
    callApi("getAllProject", [], List.codec(ProjectSnapshotAndId.codec)).then(
      (projectList) => {
        dispatchProject({
          _: "ResponseAllProjectList",
          list: projectList,
        });
      }
    );
  }, []);
  React.useEffect(() => {
    switch (logInState._) {
      case "Guest":
        return;
      case "PreparingLogInUrlRequest":
        callApi(
          "requestLogInUrl",
          RequestLogInUrlRequestData.codec.encode({
            openIdConnectProvider: logInState.provider,
            urlData,
          }),
          String.codec
        ).then((logInUrl) => {
          dispatchLogInState({
            _: "RespondLogInUrl",
            url: new URL(logInUrl),
          });
        });
        dispatchLogInState({ _: "RequestedLogInUrl" });
        return;
      case "JumpingToLogInPage":
        window.location.href = logInState.logInUrl.toString();
    }
  }, [logInState]);

  switch (logInState._) {
    case "PreparingLogInUrlRequest":
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
    case "Guest":
      return (
        <div
          css={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
          }}
        >
          <SidePanel
            model={{
              clientMode: urlData.clientMode,
              language: urlData.language,
              logInState,
              projectData,
              onJump,
            }}
            onRequestLogIn={(provider) => {
              dispatchLogInState({ _: "RequestLogInUrl", provider });
            }}
          />
          <MainPanel
            location={urlData.location}
            model={{
              clientMode: urlData.clientMode,
              language: urlData.language,
              logInState,
              projectData,
              onJump,
            }}
          />
        </div>
      );
  }
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

const jumpMessage = (url: URL, language: Language) => {
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
      return <Home model={prop.model} />;
    case "About":
      return <About />;
    default:
      return <div>他のページは準備中</div>;
  }
};

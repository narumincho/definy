/** @jsx jsx */

import * as React from "react";
import {
  Codec,
  Language,
  List,
  Maybe,
  OpenIdConnectProvider,
  ProjectResponse,
  ProjectSnapshotAndId,
  UrlData,
} from "definy-common/source/data";
import { About } from "./About";
import { Home } from "./Home";
import { LoadingBox } from "./ui";
import { LogInState } from "./model";
import { ProjectData } from "./resource";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";
import { urlDataAndAccessTokenToUrl } from "definy-common";

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

export const App: React.FC<{ urlData: UrlData }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [nowUrlData, onJump] = React.useState<UrlData>(prop.urlData);
  const [logInState, dispatchLogInState] = React.useState<LogInState>({
    _: "Guest",
  });
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
      urlDataAndAccessTokenToUrl(nowUrlData, Maybe.Nothing()).toString()
    );
  }, [nowUrlData]);
  React.useEffect(() => {
    callApi("getAllProject", [], List.codec(ProjectSnapshotAndId.codec)).then(
      (projectList) => {
        dispatchProject({
          _: "ResponseAllProjectList",
          list: projectList,
        });
      }
    );
  }, []);

  return logInState._ === "RequestingLogInUrl" ? (
    <RequestingLogInUrl
      language={nowUrlData.language}
      provider={logInState.provider}
    />
  ) : (
    <div
      css={{ height: "100%", display: "grid", gridTemplateColumns: "auto 1fr" }}
    >
      <SidePanel
        model={{
          clientMode: nowUrlData.clientMode,
          language: nowUrlData.language,
          logInState,
        }}
        onJump={onJump}
        onRequestLogIn={(provider) => {
          dispatchLogInState({ _: "RequestingLogInUrl", provider });
        }}
      />
      <MainPanel projectData={projectData} urlData={nowUrlData} />
    </div>
  );
};

const RequestingLogInUrl: React.FC<{
  provider: OpenIdConnectProvider;
  language: Language;
}> = (prop) => (
  <div
    css={{
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    }}
  >
    <LoadingBox>{logInMessage(prop.provider, prop.language)}</LoadingBox>
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

const MainPanel: React.FC<{
  urlData: UrlData;
  projectData: ProjectData;
}> = (prop) => {
  switch (prop.urlData.location._) {
    case "Home":
      return <Home projectData={prop.projectData} />;
    case "About":
      return <About />;
    default:
      return <div>他のページは準備中</div>;
  }
};

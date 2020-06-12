/** @jsx jsx */

import * as React from "react";
import { data } from "definy-common";
import * as common from "definy-common";
import { SidePanel } from "./SidePanel";
import { Home } from "./Home";
import { About } from "./About";
import { ProjectData } from "./resource";
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
  codec: data.Codec<responseType>
): Promise<responseType> =>
  fetch("https://us-central1-definy-lang.cloudfunctions.net/api/" + apiName, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

type Action =
  | {
      _: "ResponseAllProjectList";
      list: ReadonlyArray<data.ProjectSnapshotAndId>;
    }
  | { _: "ResponseProject"; response: data.ProjectResponse };

export const App: React.FC<{ urlData: data.UrlData }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [nowUrlData, onJump] = React.useState<data.UrlData>(prop.urlData);
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
      common
        .urlDataAndAccessTokenToUrl(nowUrlData, data.Maybe.Nothing())
        .toString()
    );
  }, [nowUrlData]);
  React.useEffect(() => {
    callApi(
      "getAllProject",
      [],
      data.List.codec(data.ProjectSnapshotAndId.codec)
    ).then((projectList) => {
      dispatchProject({
        _: "ResponseAllProjectList",
        list: projectList,
      });
    });
  }, []);

  return (
    <div
      css={{ height: "100%", display: "grid", gridTemplateColumns: "auto 1fr" }}
    >
      <SidePanel urlData={nowUrlData} onJump={onJump} />
      <MainPanel urlData={nowUrlData} projectData={projectData} />
    </div>
  );
};
App.displayName = "App";

const MainPanel: React.FC<{
  urlData: data.UrlData;
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

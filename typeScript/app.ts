import * as React from "react";
import * as ui from "./ui";
import { data } from "definy-common";
import * as common from "definy-common";
import { sidePanel } from "./sidePanel";
import { home } from "./home";
import { ProjectData } from "./resource";

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

const callApi = <responseType>(
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
  const [projectMap, dispatchProject] = React.useReducer(
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

  return ui.toReactElement(
    ui.row(
      {
        key: "root",
        width: { _: "Stretch" },
        height: { _: "Stretch" },
      },
      [sidePanel(nowUrlData, onJump), home(projectMap)]
    )
  );
};

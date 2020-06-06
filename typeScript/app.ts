import * as React from "react";
import * as ui from "./ui";
import {
  Maybe,
  UrlData,
  Location,
  IdeaId,
  ProjectId,
  ProjectSnapshot,
  List,
  Codec,
  ProjectResponse,
  ProjectSnapshotAndId,
} from "definy-common/source/data";
import * as common from "definy-common";

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

const sidePanelWidth = 260;

const callApi = <responseType>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: Codec<responseType>
): Promise<responseType> =>
  fetch("https://us-central1-definy-lang.cloudfunctions.net/api/" + apiName, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

type Resource<T> =
  | { _: "Loading" }
  | { _: "Loaded"; snapshot: T }
  | { _: "NotFound" };

type Action =
  | { _: "ResponseAllProjectList"; list: ReadonlyArray<ProjectSnapshotAndId> }
  | { _: "ResponseProject"; response: ProjectResponse };

export const App: React.FC<{ urlData: UrlData }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [nowUrlData, onJump] = React.useState<UrlData>(prop.urlData);
  const [projectMap, dispatchProject] = React.useReducer(
    (
      state: ReadonlyMap<ProjectId, Resource<ProjectSnapshot>>,
      action: Action
    ): ReadonlyMap<ProjectId, Resource<ProjectSnapshot>> => {
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
      common.urlDataAndAccessTokenToUrl(nowUrlData, Maybe.Nothing()).toString()
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

  return ui.row(
    {
      width: width,
      height: height,
      key: "root",
    },
    [
      [sidePanelWidth.toString() + "px", sidePanel(height, nowUrlData, onJump)],
      [
        "1fr",
        ui.column(
          { width: width - sidePanelWidth, height: height, key: "main" },
          [...projectMap].map(([id, project]) => [
            "auto",
            ui.text({ key: id, color: "#ddd" }, JSON.stringify(project)),
          ])
        ),
      ],
    ]
  );
};

const sidePanel = (
  height: number,
  urlData: UrlData,
  onJump: (urlData: UrlData) => void
) =>
  ui.column(
    {
      width: sidePanelWidth,
      height: height,
      alignContent: "start",
      backgroundColor: "Dark",
      key: "sidePanel",
    },
    [
      [
        "auto",
        ui.link(
          {
            urlData: { ...urlData, location: Location.Home },
            key: "logo",
            onJump,
          },
          ui.text(
            {
              key: "logo",
              fontSize: 32,
              color: "#b9d09b",
            },
            "Definy"
          )
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "user",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "User"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "project",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "Project"
        ),
      ],
      [
        "auto",
        ui.link(
          {
            urlData: {
              ...urlData,
              location: Location.Idea(
                "be9a40a32e2ddb7c8b09aa458fe206a1" as IdeaId
              ),
            },
            key: "link",
            onJump,
            justifySelf: "start",
          },
          ui.text(
            {
              key: "idea",
              justifySelf: "start",
              fontSize: 24,
              color: "#ddd",
            },
            "Idea"
          )
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "suggestion",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "Suggestion"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "module",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "module"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "about",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "about"
        ),
      ],
    ]
  );

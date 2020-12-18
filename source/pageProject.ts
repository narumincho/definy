import * as d from "definy-core/source/data";
import {
  AppInterface,
  Message,
  TitleAndElement,
  messageGetProject,
} from "./appInterface";
import { c, div } from "./view/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "./view/view";
import { icon } from "./icon";
import { image } from "./image";
import { userCard } from "./user";

export type State =
  | {
      readonly tag: typeof selectProjectDetail;
    }
  | {
      readonly tag: typeof selectTypePart;
      readonly typePartId: d.TypePartId;
    };

export type PageMessage =
  | {
      readonly tag: typeof selectProjectDetail;
    }
  | {
      readonly tag: typeof selectTypePart;
      readonly typePartId: d.TypePartId;
    };

const selectProjectDetail = Symbol("PageModelState-SelectProjectDetail");
const selectTypePart = Symbol("PageModelState-SelectTypePart");

export const init = (
  messageHandler: (message: Message) => void,
  projectId: d.ProjectId
): State => {
  messageHandler({
    tag: messageGetProject,
    projectId,
  });
  return {
    tag: selectProjectDetail,
  };
};

export const updateSateByLocalMessage = (
  state: State,
  pageMessage: PageMessage
): State => {
  switch (pageMessage.tag) {
    case selectProjectDetail:
      return {
        tag: selectProjectDetail,
      };
    case selectTypePart:
      return {
        tag: selectTypePart,
        typePartId: pageMessage.typePartId,
      };
  }
};

export const view = (
  appInterface: AppInterface,
  projectId: d.ProjectId,
  state: State
): TitleAndElement => {
  const projectState = appInterface.projectMap.get(projectId);
  if (projectState === undefined) {
    return {
      title: "プロジェクト詳細ページの準備",
      element: div({ style: containerStyle }, "..."),
    };
  }
  switch (projectState._) {
    case "Requesting":
      return {
        title: "プロジェクト取得中",
        element: div(
          { style: containerStyle },
          c([["icon", icon("Requesting")]])
        ),
      };
    case "Unknown":
      return {
        title: "不明なプロジェクト",
        element: div({ style: containerStyle }, "?"),
      };
    case "Deleted":
      return {
        title: "存在しないプロジェクト",
        element: div(
          { style: containerStyle },
          "現在, projectId が " + projectId + " のプロジェクトは存在しません"
        ),
      };
    case "Loaded":
      return {
        title: projectState.dataWithTime.data.name,
        element: div(
          {
            style: {
              ...containerStyle,
              display: "grid",
              gridTemplateColumns: "300px 1fr 400px",
            },
          },
          c([
            [
              "tree",
              div(
                {
                  style: {
                    backgroundColor: "#555",
                    justifySelf: "stretch",
                  },
                },
                "tree"
              ),
            ],
            [
              "main",
              projectDetailView(
                appInterface,
                projectId,
                projectState.dataWithTime.data
              ),
            ],
            [
              "detail",
              div(
                {
                  style: {
                    backgroundColor: "#555",
                    justifySelf: "stretch",
                  },
                },
                "detail"
              ),
            ],
          ])
        ),
      };
  }
};

const treeView = (
  appInterface: AppInterface,
  state: State
): Element<Message> => {};

const containerStyle: CSSObject = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
};

const projectDetailView = (
  appInterface: AppInterface,
  projectId: d.ProjectId,
  project: d.Project
): Element<Message> => {
  return div(
    {
      style: {
        padding: 16,
        display: "grid",
        gap: 4,
        alignContent: "start",
      },
    },
    c([
      [
        "iconAndName",
        div(
          {
            style: {
              padding: 8,
              display: "grid",
              alignItems: "center",
              gridTemplateColumns: "48px 1fr",
              gap: 8,
              width: "100%",
              margin: 0,
            },
          },
          c([
            [
              "icon",
              image({
                imageToken: project.iconHash,
                appInterface,
                alternativeText: project.name + "のアイコン",
                width: 48,
                height: 48,
                isCircle: false,
              }),
            ],
            ["name", div({}, project.name)],
          ])
        ),
      ],
      [
        "image",
        image({
          imageToken: project.imageHash,
          appInterface,
          alternativeText: "image",
          width: 1024 / 2,
          height: 633 / 2,
          isCircle: false,
        }),
      ],
      [
        "creator",
        div(
          {},
          c([
            ["label", div({}, "作成者")],
            ["card", userCard(appInterface, project.createUserId)],
          ])
        ),
      ],
    ])
  );
};

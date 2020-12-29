import * as a from "./appInterface";
import * as d from "definy-core/source/data";
import { c, div, elementMap } from "./view/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "./view/view";
import { button } from "./button";
import { icon } from "./icon";
import { image } from "./image";
import { mapMapValue } from "./util";
import { typePartEditor } from "./typePartEditor";
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
  messageHandler: (message: a.Message) => void,
  projectId: d.ProjectId
): State => {
  messageHandler({
    tag: a.messageGetProject,
    projectId,
  });
  messageHandler({
    tag: a.messageGetTypePartInProject,
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
  appInterface: a.AppInterface,
  projectId: d.ProjectId,
  state: State
): a.TitleAndElement<a.InterfaceMessage<PageMessage>> => {
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
            ["tree", treeView(appInterface, state)],
            [
              "main",
              mainView(
                appInterface,
                state,
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
  appInterface: a.AppInterface,
  state: State
): Element<a.InterfaceMessage<PageMessage>> => {
  return div(
    {
      style: {
        backgroundColor: "#555",
        justifySelf: "stretch",
        display: "grid",
        overflowY: "scroll",
      },
    },
    c<a.InterfaceMessage<PageMessage>>([
      [
        "toDetail",
        elementMap(button({}, "プロジェクト詳細"), () =>
          a.interfaceMessagePageMessage({
            tag: selectProjectDetail,
          })
        ),
      ],
      ...mapMapValue(
        appInterface.typePartMap,
        (
          typePartResourceState,
          typePartId
        ): Element<a.InterfaceMessage<PageMessage>> =>
          elementMap(
            button(
              {},
              typePartResourceState._ === "Loaded"
                ? typePartResourceState.dataWithTime.data.name
                : "???"
            ),
            () =>
              a.interfaceMessagePageMessage({
                tag: selectTypePart,
                typePartId,
              })
          )
      ),
    ])
  );
};

const containerStyle: CSSObject = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
};

const mainView = (
  appInterface: a.AppInterface,
  state: State,
  projectId: d.ProjectId,
  project: d.Project
): Element<a.InterfaceMessage<PageMessage>> => {
  switch (state.tag) {
    case selectProjectDetail:
      return projectDetailView(appInterface, projectId, project);
    case selectTypePart:
      return typePartEditor(appInterface, state.typePartId);
  }
};

const projectDetailView = (
  appInterface: a.AppInterface,
  projectId: d.ProjectId,
  project: d.Project
): Element<a.InterfaceMessage<PageMessage>> => {
  return div<a.InterfaceMessage<PageMessage>>(
    {
      style: {
        padding: 16,
        display: "grid",
        gap: 4,
        alignContent: "start",
      },
    },
    c<a.InterfaceMessage<PageMessage>>([
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
        div<a.InterfaceMessage<PageMessage>>(
          {},
          c<a.InterfaceMessage<PageMessage>>([
            ["label", div({}, "作成者")],
            [
              "card",
              elementMap<a.Message, a.InterfaceMessage<PageMessage>>(
                userCard(appInterface, project.createUserId),
                a.interfaceMessageAppMessage
              ),
            ],
          ])
        ),
      ],
    ])
  );
};

import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as typePartEditor from "./typePartEditor";
import { box, text } from "./ui";
import { c, div, elementMap } from "./view/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "./view/view";
import { button } from "./button";
import { icon } from "./icon";
import { image } from "./image";
import { mapMapValue } from "./util";
import { tagEditor } from "./tagEditor";
import { userCard } from "./user";

export interface PageState {
  readonly selection: Selection;
  readonly codeTab: CodeTab;
}

type CodeTab = "javaScript" | "typeScript" | "elm";

type Selection =
  | {
      readonly tag: "SelectProjectDetail";
    }
  | {
      readonly tag: "SelectTypePart";
      readonly typePartId: d.TypePartId;
    };

export type PageMessage =
  | {
      readonly tag: "SelectProjectDetail";
    }
  | {
      readonly tag: "SelectTypePart";
      readonly typePartId: d.TypePartId;
    }
  | { readonly tag: "SelectCodeTab"; newCodeTab: CodeTab };

const selectCodeTabMessage = (newCodeTab: CodeTab): a.Message => ({
  tag: "PageProject",
  message: {
    tag: "SelectCodeTab",
    newCodeTab,
  },
});

export const init = (
  messageHandler: (message: a.Message) => void,
  projectId: d.ProjectId
): PageState => {
  messageHandler({
    tag: a.messageGetProject,
    projectId,
  });
  messageHandler({
    tag: a.messageGetTypePartInProject,
    projectId,
  });
  return {
    selection: { tag: "SelectProjectDetail" },
    codeTab: "typeScript",
  };
};

export const updateSateByLocalMessage = (
  state: PageState,
  pageMessage: PageMessage,
  messageHandler: (message: a.Message) => void
): PageState => {
  switch (pageMessage.tag) {
    case "SelectProjectDetail":
      return {
        ...state,
        selection: {
          tag: "SelectProjectDetail",
        },
      };
    case "SelectTypePart":
      return {
        ...state,
        selection: {
          tag: "SelectTypePart",
          typePartId: pageMessage.typePartId,
        },
      };
    case "SelectCodeTab":
      return {
        ...state,
        codeTab: pageMessage.newCodeTab,
      };
  }
};

export const view = (
  appInterface: a.State,
  projectId: d.ProjectId,
  state: PageState
): a.TitleAndElement<a.Message> => {
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
  appInterface: a.State,
  state: PageState
): Element<a.Message> => {
  return div(
    {
      style: {
        backgroundColor: "#555",
        justifySelf: "stretch",
        display: "grid",
        overflowY: "scroll",
      },
    },
    c<a.Message>([
      [
        "toDetail",
        button(
          {
            click: {
              tag: "PageProject",
              message: { tag: "SelectProjectDetail" },
            },
          },
          "プロジェクト詳細"
        ),
      ],
      ...mapMapValue(
        appInterface.typePartMap,
        (typePartResourceState, typePartId): Element<a.Message> =>
          button(
            {
              click: {
                tag: "PageProject",
                message: {
                  tag: "SelectTypePart",
                  typePartId,
                },
              },
            },
            typePartResourceState._ === "Loaded"
              ? typePartResourceState.dataWithTime.data.name
              : "???"
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
  state: a.State,
  pageState: PageState,
  projectId: d.ProjectId,
  project: d.Project
): Element<a.Message> => {
  switch (pageState.selection.tag) {
    case "SelectProjectDetail":
      return projectDetailView(state, pageState, projectId, project);
    case "SelectTypePart": {
      const { typePartId } = pageState.selection;
      return div<a.Message>(
        {
          style: {
            overflowY: "scroll",
            width: "100%",
          },
        },
        c([
          [
            "e",
            elementMap<typePartEditor.Message, a.Message>(
              typePartEditor.view(state, typePartId),
              (typePartEditorMessage) => ({
                tag: a.messageTypePartMessage,
                typePartId,
                typePartMessage: typePartEditorMessage,
              })
            ),
          ],
        ])
      );
    }
  }
};

const projectDetailView = (
  state: a.State,
  pageState: PageState,
  projectId: d.ProjectId,
  project: d.Project
): Element<a.Message> => {
  return div<a.Message>(
    {
      style: {
        padding: 16,
        display: "grid",
        gap: 4,
        alignContent: "start",
      },
    },
    c<a.Message>([
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
                appInterface: state,
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
          appInterface: state,
          alternativeText: "image",
          width: 1024 / 2,
          height: 633 / 2,
          isCircle: false,
        }),
      ],
      [
        "creator",
        div<a.Message>(
          {},
          c<a.Message>([
            ["label", div({}, "作成者")],
            ["card", userCard(state, project.createUserId)],
          ])
        ),
      ],
      [
        "generateCodeButton",
        button<a.Message>(
          { click: { tag: a.messageGenerateCode } },
          "コード生成"
        ),
      ],
      ["codeOutput", codeOutput(state, pageState.codeTab)],
    ])
  );
};

const codeOutput = (state: a.State, codeTab: CodeTab): Element<a.Message> => {
  switch (state.outputCode.tag) {
    case "notGenerated":
      return text("まだコードを生成していない");
    case "generated":
      return box(
        {
          padding: 0,
          direction: "y",
        },
        c([
          [
            "tag",
            elementMap(
              tagEditor<CodeTab>(
                ["typeScript", "javaScript", "elm"],
                codeTab,
                "codeTab"
              ),
              selectCodeTabMessage
            ),
          ],
          ["content", text(state.outputCode[codeTab])],
        ])
      );
    case "error":
      return text(
        "コード生成のときにエラーが発生した" + state.outputCode.errorMessage
      );
  }
};

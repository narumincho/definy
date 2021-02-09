import * as a from "./messageAndState";
import * as d from "definy-core/source/data";
import * as typePartEditor from "./typePartEditor";
import { box, text } from "./ui";
import { c, div, elementMap } from "@narumincho/html/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "@narumincho/html/view";
import { button } from "./button";
import { icon } from "./icon";
import { image } from "./image";
import { mapMapValue } from "./util";
import { multiLineTextEditor } from "./multilineTextInput";
import { oneLineTextEditor } from "./oneLineTextInput";
import { tagEditor } from "./tagEditor";
import { userCard } from "./user";

export interface PageState {
  readonly selection: Selection;
  readonly codeTab: CodeTab;
  readonly searchText: string;
}

type CodeTab = "javaScript" | "typeScript" | "elm";

type Selection =
  | {
      readonly tag: "SelectProjectDetail";
    }
  | {
      readonly tag: "SelectTypePart";
      readonly typePartId: d.TypePartId;
      readonly childSelection: typePartEditor.Selection | undefined;
    };

export type PageMessage =
  | {
      readonly tag: "SelectProjectDetail";
    }
  | {
      readonly tag: "SelectTypePart";
      readonly typePartId: d.TypePartId;
    }
  | { readonly tag: "SelectCodeTab"; newCodeTab: CodeTab }
  | {
      readonly tag: "SetSearchText";
      readonly newSearchText: string;
    }
  | {
      readonly tag: "TypePartMessage";
      readonly typePartId: d.TypePartId;
      readonly message: typePartEditor.Message;
    };

const selectCodeTabMessage = (newCodeTab: CodeTab): a.Message => ({
  tag: "PageProject",
  message: {
    tag: "SelectCodeTab",
    newCodeTab,
  },
});
const setSearchText = (newSearchText: string): a.Message => ({
  tag: "PageProject",
  message: {
    tag: "SetSearchText",
    newSearchText,
  },
});

/**
 * TypePartEditor の Message を ProjectPage の Message に変換する
 * 直接 a.MessageのTypePartMessage を呼ぶと選択位置の変更が反映されないので注意
 */
const typePartEditorMessageToMessage = (
  typePartEditorMessage: typePartEditor.Message,
  typePartId: d.TypePartId
): a.Message => ({
  tag: "PageProject",
  message: {
    tag: "TypePartMessage",
    typePartId,
    message: typePartEditorMessage,
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
    searchText: "",
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
          childSelection: undefined,
        },
      };
    case "SelectCodeTab":
      return {
        ...state,
        codeTab: pageMessage.newCodeTab,
      };
    case "SetSearchText":
      return {
        ...state,
        searchText: pageMessage.newSearchText,
      };
    case "TypePartMessage": {
      if (state.selection.tag !== "SelectTypePart") {
        return state;
      }
      messageHandler({
        tag: a.messageTypePartMessage,
        typePartId: pageMessage.typePartId,
        typePartMessage: pageMessage.message,
      });
      if (state.selection.typePartId !== pageMessage.typePartId) {
        return state;
      }
      return {
        ...state,
        selection: {
          tag: "SelectTypePart",
          typePartId: state.selection.typePartId,
          childSelection: typePartEditor.updateSelection(
            undefined,
            state.selection.childSelection,
            pageMessage.message
          ),
        },
      };
    }
  }
};

export const view = (
  state: a.State,
  projectId: d.ProjectId,
  pageState: PageState
): a.TitleAndElement<a.Message> => {
  const projectState = state.projectMap.get(projectId);
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
              gridTemplateColumns: "250px 1fr 400px",
            },
          },
          c([
            ["tree", treeView(state, projectId, pageState)],
            [
              "main",
              mainView(
                state,
                pageState,
                projectId,
                projectState.dataWithTime.data
              ),
            ],
            ["detail", detailView(state, pageState)],
          ])
        ),
      };
  }
};

const treeView = (
  state: a.State,
  projectId: d.ProjectId,
  pageState: PageState
): Element<a.Message> => {
  return div(
    {
      style: {
        backgroundColor: "#555",
        justifySelf: "stretch",
        alignContent: "start",
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
      ["search", oneLineTextEditor({}, pageState.searchText, setSearchText)],
      ...typePartNameListView(state, projectId, pageState.searchText),
      ["add", addTypePartButton(state, projectId)],
      ["addNoSave", addTypePartNoSaveButton(state, projectId)],
    ])
  );
};

const typePartNameListView = (
  state: a.State,
  projectId: d.ProjectId,
  searchText: string
): ReadonlyMap<string, Element<a.Message>> => {
  if (state.getTypePartInProjectState._ === "Requesting") {
    return new Map([["listNote", text<a.Message>("取得中")]]);
  }
  return mapMapValue(state.typePartMap, (resource, typePartId):
    | Element<a.Message>
    | undefined => {
    if (resource._ !== "Loaded") {
      return undefined;
    }
    if (resource.dataWithTime.data.projectId !== projectId) {
      return undefined;
    }
    if (
      resource.dataWithTime.data.name
        .toLocaleLowerCase()
        .includes(searchText.toLocaleLowerCase())
    ) {
      return button(
        {
          click: {
            tag: "PageProject",
            message: {
              tag: "SelectTypePart",
              typePartId,
            },
          },
        },
        resource.dataWithTime.data.name
      );
    }
  });
};

const addTypePartButton = (
  state: a.State,
  projectId: d.ProjectId
): Element<a.Message> => {
  const projectResource = state.projectMap.get(projectId);
  if (projectResource === undefined || projectResource._ !== "Loaded") {
    return text("...");
  }
  switch (state.typePartEditState) {
    case "Adding":
      return text("追加中");
    case "Error":
      return text("エラーが発生");
    case "None":
      if (a.getAccountToken(state) === undefined) {
        return text("ログインしていないため追加できない");
      }
      if (state.logInState._ !== "LoggedIn") {
        return text("ログイン処理中. 作成者かどうか判別がつかない");
      }
      if (
        state.logInState.accountTokenAndUserId.userId !==
        projectResource.dataWithTime.data.createUserId
      ) {
        return text("このプロジェクトの作成者でないため追加できない");
      }
      return button<a.Message>(
        { click: { tag: "AddTypePart", projectId } },
        "+ 保存して追加する"
      );
    case "Saving":
      return text("保存中……");
  }
};

const addTypePartNoSaveButton = (
  state: a.State,
  projectId: d.ProjectId
): Element<a.Message> => {
  const projectResource = state.projectMap.get(projectId);
  if (projectResource === undefined || projectResource._ !== "Loaded") {
    return text("...");
  }
  switch (state.typePartEditState) {
    case "Adding":
      return text("追加中");
    case "Error":
      return text("エラーが発生");
    case "None":
      if (a.getAccountToken(state) === undefined) {
        return text("ログインしていないため追加できない");
      }
      if (state.logInState._ !== "LoggedIn") {
        return text("ログイン処理中. 作成者かどうか判別がつかない");
      }
      if (
        state.logInState.accountTokenAndUserId.userId !==
        projectResource.dataWithTime.data.createUserId
      ) {
        return text("このプロジェクトの作成者でないため追加できない");
      }
      return button<a.Message>(
        { click: { tag: "AddTypePartNoSave", projectId } },
        "+ 追加する (保存なし)"
      );
    case "Saving":
      return text("保存中……");
  }
};

const containerStyle: CSSObject = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "hidden",
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
            padding: 4,
          },
        },
        c([
          [
            "e",
            typePartEditor.view(
              state,
              typePartId,
              pageState.selection.childSelection,
              (typePartEditorMessage) =>
                typePartEditorMessageToMessage(
                  typePartEditorMessage,
                  typePartId
                )
            ),
          ],
          [
            "saveButton",
            state.typePartEditState === "None"
              ? button<a.Message>(
                  { click: { tag: "SaveTypePart", typePartId } },
                  "保存"
                )
              : text("処理中"),
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
        overflowY: "scroll",
        width: "100%",
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
      ["saveButton", saveButton(state, projectId, project)],
      [
        "generateCodeButton",
        button<a.Message>(
          { click: { tag: a.messageGenerateCode } },
          "コードを生成する"
        ),
      ],
      ["codeOutput", codeOutput(state, pageState.codeTab)],
    ])
  );
};

const saveButton = (
  state: a.State,
  projectId: d.ProjectId,
  project: d.Project
): Element<a.Message> => {
  switch (state.typePartEditState) {
    case "None":
      if (a.getAccountToken(state) === undefined) {
        return text("ログインしていないため保存できない");
      }
      if (state.logInState._ !== "LoggedIn") {
        return text("ログイン処理中. 作成者かどうか判別がつかない");
      }
      if (
        state.logInState.accountTokenAndUserId.userId !== project.createUserId
      ) {
        return text("このプロジェクトの作成者でないため保存できない");
      }
      return button<a.Message>(
        { click: { tag: a.messageSetTypePartList, projectId } },
        "このプロジェクトの型パーツをすべて保存する"
      );
    case "Adding":
      return text("型パーツ追加中は保存できない");
    case "Error":
      return text("型パーツ保存追加周りでエラーが発生した");
    case "Saving":
      return text("型パーツを保存中");
  }
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
          ["content", multiLineTextEditor({}, state.outputCode[codeTab], null)],
        ])
      );
    case "error":
      return text(
        "コード生成のときにエラーが発生した" + state.outputCode.errorMessage
      );
  }
};

export const detailView = (
  state: a.State,
  pageState: PageState
): Element<a.Message> => {
  return box(
    { padding: 8, direction: "y", isScrollY: true },
    c([
      ["title", text("DetailView")],
      ["note", detailViewMain(state, pageState.selection)],
    ])
  );
};

const detailViewMain = (
  state: a.State,
  selection: Selection
): Element<a.Message> => {
  switch (selection.tag) {
    case "SelectProjectDetail":
      return text("プロジェクトの詳細");
    case "SelectTypePart": {
      return elementMap(
        typePartEditor.editor(
          state,
          selection.typePartId,
          selection.childSelection
        ),
        (typePartEditorMessage) =>
          typePartEditorMessageToMessage(
            typePartEditorMessage,
            selection.typePartId
          )
      );
    }
  }
};

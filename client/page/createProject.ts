import {
  Message as AppMessage,
  State as AppState,
  TitleAndElement,
} from "../messageAndState";
import { c, div } from "@narumincho/html/viewUtil";
import { button } from "../ui/button";
import { view as nView } from "@narumincho/html";
import { oneLineTextEditor } from "../ui/oneLineTextInput";
import { stringToValidProjectName } from "definy-core/main";
import { text } from "../ui";

export type State = {
  projectName: string;
  isCreating: boolean;
};

export type Message =
  | {
      tag: "SetProjectName";
      projectName: string;
    }
  | {
      tag: "CreateProject";
    };

const setProjectName = (projectName: string): AppMessage => ({
  tag: "CreateProjectPageMessage",
  message: {
    tag: "SetProjectName",
    projectName,
  },
});

const createProject: AppMessage = {
  tag: "CreateProjectPageMessage",
  message: {
    tag: "CreateProject",
  },
};

export const initState: State = {
  projectName: "",
  isCreating: false,
};

export const update = (message: Message, state: State): State => {
  switch (message.tag) {
    case "SetProjectName":
      if (state.isCreating) {
        return state;
      }
      return {
        projectName: message.projectName,
        isCreating: false,
      };
    case "CreateProject": {
      const normalizedProjectName = stringToValidProjectName(state.projectName);
      if (normalizedProjectName === null) {
        return state;
      }
      return {
        projectName: normalizedProjectName,
        isCreating: true,
      };
    }
  }
};

export const view = (appState: AppState, state: State): TitleAndElement => {
  if (state.isCreating) {
    return {
      title: `${state.projectName}を作成中……`,
      element: div({}, `${state.projectName}を作成中……`),
    };
  }
  return {
    title: "プロジェクトの作成",
    element: viewMain(appState, state),
  };
};

export const viewMain = (
  appState: AppState,
  state: State
): nView.Element<AppMessage> => {
  const normalizedProjectName = stringToValidProjectName(state.projectName);
  return div(
    {},
    c([
      ["title", text("プロジェクトの作成")],
      ["input", oneLineTextEditor({}, state.projectName, setProjectName)],
      normalizedProjectName === null
        ? ["projectNameError", text("不正なプロジェクト名です")]
        : [
            "button",
            button(
              { click: createProject },
              `${normalizedProjectName}を作成する`
            ),
          ],
    ])
  );
};

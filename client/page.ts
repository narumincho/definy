import * as d from "../data";
import * as pageAbout from "./page/about";
import * as pageCreateProject from "./page/createProject";
import * as pageDebug from "./page/debug";
import * as pageHome from "./page/home";
import * as pageProject from "./page/project";
import * as pageSetting from "./page/setting";
import * as pageTypePart from "./page/editTypePart";
import * as pageUser from "./page/user";
import type { Message, State, TitleAndElement } from "./messageAndState";

/**
 * どのページを開いているかと, 各ページ内の状態
 */
export type PageState =
  | { readonly tag: "Home" }
  | { readonly tag: "CreateProject"; state: pageCreateProject.State }
  | {
      readonly tag: "About";
    }
  | {
      readonly tag: "User";
      readonly userId: d.AccountId;
    }
  | {
      readonly tag: "Debug";
      readonly tab: pageDebug.Tab;
    }
  | {
      readonly tag: "Setting";
    }
  | {
      readonly tag: "Project";
      readonly projectId: d.ProjectId;
      readonly state: pageProject.PageState;
    }
  | {
      readonly tag: "TypePart";
      readonly typePartId: d.TypePartId;
      readonly state: pageTypePart.State;
    };

/**
 * ページのタイトルと内容
 */
export const titleAndElement = (state: State): TitleAndElement<Message> => {
  switch (state.pageState.tag) {
    case "Home":
      return pageHome.view(state);
    case "CreateProject":
      return pageCreateProject.view(state, state.pageState.state);
    case "About":
      return pageAbout.view(state);
    case "User":
      return pageUser.view(state, state.pageState.userId);
    case "Debug":
      return pageDebug.view(state, state.pageState.tab);
    case "Setting":
      return pageSetting.view(state);
    case "Project":
      return pageProject.view(
        state,
        state.pageState.projectId,
        state.pageState.state
      );
    case "TypePart":
      return pageTypePart.view(
        state,
        state.pageState.typePartId,
        state.pageState.state
      );
  }
};

export const locationToInitPageState = (
  messageHandler: (message: Message) => void,
  location: d.Location
): PageState => {
  switch (location._) {
    case "Home":
      callMessageList(pageHome.init(), messageHandler);
      return { tag: "Home" };
    case "CreateProject":
      return { tag: "CreateProject", state: pageCreateProject.initState };
    case "About":
      return { tag: "About" };
    case "Account":
      callMessageList(pageUser.init(location.accountId), messageHandler);
      return { tag: "User", userId: location.accountId };
    case "Debug":
      return { tag: "Debug", tab: pageDebug.init };
    case "Setting":
      return { tag: "Setting" };
    case "Project": {
      const messageListAndPageModel = pageProject.init(location.projectId);
      callMessageList(messageListAndPageModel.messageList, messageHandler);
      return {
        tag: "Project",
        projectId: location.projectId,
        state: messageListAndPageModel.pageState,
      };
    }
    case "TypePart": {
      const messageListAndState = pageTypePart.init;
      callMessageList(messageListAndState.messageList, messageHandler);
      return {
        tag: "TypePart",
        typePartId: location.typePartId,
        state: messageListAndState.state,
      };
    }
  }
};

const callMessageList = (
  messageList: ReadonlyArray<Message>,
  messageHandler: (message: Message) => void
): void => {
  for (const message of messageList) {
    messageHandler(message);
  }
};

export const pageStateToLocation = (pageModel: PageState): d.Location => {
  switch (pageModel.tag) {
    case "Home":
      return d.Location.Home;
    case "CreateProject":
      return d.Location.CreateProject;
    case "About":
      return d.Location.About;
    case "User":
      return d.Location.Account(pageModel.userId);
    case "Debug":
      return d.Location.Debug;
    case "Setting":
      return d.Location.Setting;
    case "Project":
      return d.Location.Project(pageModel.projectId);
    case "TypePart":
      return d.Location.TypePart(pageModel.typePartId);
  }
};

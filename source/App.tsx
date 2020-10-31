import * as d from "definy-core/source/data";
import * as ui from "./ui";
import { VNode, h } from "maquette";
import { About } from "./Page/About";
import { Commit } from "./Page/Commit";
import { Debug } from "./Page/Debug";
import { Home } from "./Page/Home";
import { Model } from "./model";
import { Project } from "./Page/Project";
import { Setting } from "./Page/Setting";
import { User } from "./Page/User";
import { createProject } from "./Page/CreateProject";
import { header } from "./Header";

export const app = (model: Model): VNode => {
  switch (model.logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return h("div", {}, [
        logInMessage(model.logInState.openIdConnectProvider, model.language),
      ]);
    case "JumpingToLogInPage":
      return requestingLogInUrl(
        jumpMessage(new URL(model.logInState.string), model.language)
      );
  }
  return h("div", { class: "app__main-root" }, [
    header(model),
    MainPanel(model),
  ]);
};

const requestingLogInUrl = (message: string): VNode =>
  h("div", { class: "app__requesting-log-in-url" }, [ui.LoadingBox([message])]);

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
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

const jumpMessage = (url: URL, language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const MainPanel = (model: Model): VNode => {
  switch (model.location._) {
    case "Home":
      return Home({ model });
    case "CreateProject":
      return createProject({ model });
    case "Project":
      return Project({
        model,
        page: { _: "Project", projectId: model.location.projectId },
      });
    case "User":
      return User({ model, userId: model.location.userId });
    case "Idea":
      return Project({
        model,
        page: { _: "Idea", ideaId: model.location.ideaId },
      });
    case "Commit":
      return Commit({ model, commitId: model.location.commitId });
    case "Setting":
      return Setting({ model });
    case "About":
      return About;
    case "Debug":
      return Debug()();
    default:
      return h("div", {}, ["他のページは準備中"]);
  }
};

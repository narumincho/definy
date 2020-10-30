import * as d from "definy-core/source/data";
import * as ui from "./ui";
import { Init, Model, useModel } from "./model";
import { VNode, h } from "maquette";
import { About } from "./Page/About";
import { Commit } from "./Page/Commit";
import { Debug } from "./Page/Debug";
import { Home } from "./Page/Home";
import { Project } from "./Page/Project";
import { Setting } from "./Page/Setting";
import { User } from "./Page/User";
import { createProject } from "./Page/CreateProject";
import { header } from "./Header";

export const app = (prop: Init): VNode => {
  const model = useModel(prop);
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
    MainPanel({ location: model.location, model }),
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

const MainPanel = (prop: { model: Model; location: d.Location }): VNode => {
  switch (prop.location._) {
    case "Home":
      return Home({ model: prop.model });
    case "CreateProject":
      return createProject({ model: prop.model });
    case "Project":
      return Project({
        model: prop.model,
        page: { _: "Project", projectId: prop.location.projectId },
      });
    case "User":
      return User({ model: prop.model, userId: prop.location.userId });
    case "Idea":
      return Project({
        model: prop.model,
        page: { _: "Idea", ideaId: prop.location.ideaId },
      });
    case "Commit":
      return Commit({ commitId: prop.location.commitId, model: prop.model });
    case "Setting":
      return Setting({ model: prop.model });
    case "About":
      return About;
    case "Debug":
      return Debug()();
    default:
      return h("div", {}, ["他のページは準備中"]);
  }
};

import * as about from "./Page/About";
import * as core from "definy-core";
import * as createProject from "./Page/CreateProject";
import * as d from "definy-core/source/data";
import * as debug from "./Page/Debug";
import * as header from "./Header";
import * as home from "./Page/Home";
import * as project from "./Page/Project";
import * as setting from "./Page/Setting";
import * as ui from "./ui";
import * as user from "./Page/User";
import { Projector, VNode, h } from "maquette";
import { ModelInterface } from "./modelInterface";

type LocationModel =
  | { _: "About" }
  | { _: "Debug"; model: debug.Model }
  | { _: "Project"; model: project.Model }
  | { _: "Setting"; model: setting.Model }
  | { _: "User"; model: user.Model }
  | { _: "CreateProject"; model: createProject.Model }
  | { _: "Home"; model: home.Model };

/** ModelInterface にページの状態管理を含めた, アプリの状態 */
export class Model {
  modelInterface: ModelInterface;

  locationModel: LocationModel;

  constructor(
    param: { initUrlData: d.UrlData; accountToken: d.Maybe<d.AccountToken> },
    projector: Projector
  ) {
    const initUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;

    this.modelInterface = new ModelInterface(
      {
        accountToken: param.accountToken,
        clientMode: initUrlData.clientMode,
        language: initUrlData.language,
      },
      projector,
      this.jump,
      false
    );

    // ブラウザのURLを正規化
    window.history.replaceState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(param.initUrlData, d.Maybe.Nothing())
        .toString()
    );

    this.locationModel = locationToLocationModel(
      initUrlData.location,
      this.modelInterface
    );

    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
      const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
        new URL(window.location.href)
      ).urlData;
      this.modelInterface.language = newUrlData.language;
      this.modelInterface.clientMode = newUrlData.clientMode;
      this.locationModel = locationToLocationModel(
        newUrlData.location,
        this.modelInterface
      );
    });
  }

  jump(urlData: d.UrlData): void {
    window.history.pushState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            language: urlData.language,
            location: urlData.location,
            clientMode: urlData.clientMode,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
    this.locationModel = locationToLocationModel(
      urlData.location,
      this.modelInterface
    );
  }
}

const locationToLocationModel = (
  location: d.Location,
  modelInterface: ModelInterface
): LocationModel => {
  switch (location._) {
    case "About":
      return {
        _: "About",
      };
    case "Commit":
      return {
        _: "Home",
        model: new home.Model(modelInterface),
      };
    case "CreateProject":
      return {
        _: "CreateProject",
        model: new createProject.Model(modelInterface),
      };
    case "Debug":
      return {
        _: "Debug",
        model: new debug.Model(modelInterface),
      };
    case "Home":
      return {
        _: "Home",
        model: new home.Model(modelInterface),
      };
    case "Idea":
      return {
        _: "Home",
        model: new home.Model(modelInterface),
      };
    case "Project":
      return {
        _: "Project",
        model: new project.Model(modelInterface, location.projectId),
      };
    case "Setting":
      return {
        _: "Setting",
        model: new setting.Model(modelInterface),
      };
    case "User":
      return {
        _: "User",
        model: new user.Model(modelInterface, location.userId),
      };
  }
};

/**
 * Definy アプリの 見た目を作成する
 * @param model アプリの状態
 */
export const view = (model: Model): VNode => {
  switch (model.modelInterface.logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return h("div", {}, [
        logInMessage(
          model.modelInterface.logInState.openIdConnectProvider,
          model.modelInterface.language
        ),
      ]);
    case "JumpingToLogInPage":
      return requestingLogInUrl(
        jumpMessage(
          new URL(model.modelInterface.logInState.string),
          model.modelInterface.language
        )
      );
  }
  return h("div", { class: "app__main-root" }, [
    header.view(model.modelInterface),
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
  switch (model.locationModel._) {
    case "About":
      return about.view;
    case "Debug":
      return debug.view(model.locationModel.model);
    case "Project":
      return project.view(model.locationModel.model);
    case "Setting":
      return setting.view(model.locationModel.model);
    case "User":
      return user.view(model.locationModel.model);
    case "CreateProject":
      return createProject.view(model.locationModel.model);
    case "Home":
      return home.view(model.locationModel.model);
  }
};

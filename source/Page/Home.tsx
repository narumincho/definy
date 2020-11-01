import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { HomeProjectState, ModelInterface } from "../modelInterface";
import { VNode, h } from "maquette";

export class Model {
  modelInterface: ModelInterface;

  /** 初期化 */
  constructor(modelInterface: ModelInterface) {
    this.modelInterface = modelInterface;
    this.modelInterface.requestAllTop50Project();
  }
}

export const view = (model: Model): VNode => {
  return h("div", { class: "home__root" }, [
    homeMain(model),
    ...(model.modelInterface.logInState._ === "Guest"
      ? []
      : [createProjectButton(model.modelInterface)]),
  ]);
};

const homeMain = (model: Model): VNode => {
  return h("div", { class: "home__main" }, [
    h("div", { class: "home__link-list" }, [
      ui.link(
        {
          class: "home__link",
          areaTheme: "Gray",
          modelInterface: model.modelInterface,
          location: d.Location.About,
        },
        ["Definyについて"]
      ),
      ui.link(
        {
          class: "home__link",
          areaTheme: "Gray",
          modelInterface: model.modelInterface,
          location: d.Location.Debug,
        },
        ["デバッグページ"]
      ),
    ]),
    AllProjectList(
      model.modelInterface,
      model.modelInterface.top50ProjectIdState
    ),
  ]);
};

const AllProjectList = (
  modelInterface: ModelInterface,
  homeProjectState: HomeProjectState
): VNode => {
  return ui.commonResourceStateView<ReadonlyArray<d.ProjectId>>({
    dataView: (allProjectIdList): VNode => {
      if (allProjectIdList.length === 0) {
        return h("div", {}, ["プロジェクトが1つもありません"]);
      }
      return h(
        "div",
        { class: "home__project-list" },
        allProjectIdList.map((projectId) =>
          ui.project({
            key: projectId,
            modelInterface,
            projectId,
          })
        )
      );
    },
    resourceState: ((): d.ResourceState<ReadonlyArray<d.ProjectId>> => {
      switch (homeProjectState._) {
        case "Loaded":
          return d.ResourceState.Loaded({
            dataMaybe: d.Maybe.Just(homeProjectState.projectIdList),
            getTime: { day: 0, millisecond: 0 },
          });
        case "Loading":
          return d.ResourceState.Loading();
        case "None":
          return d.ResourceState.Unknown();
      }
    })(),
  });
};

const createProjectButton = (modelInterface: ModelInterface): VNode =>
  h("div", { class: "home__create-project" }, [
    ui.link(
      {
        class: "home__create-project-link",
        areaTheme: "Active",
        modelInterface,
        location: d.Location.CreateProject,
      },
      [createProjectMessage(modelInterface.language)]
    ),
  ]);

const createProjectMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "プロジェクトを新規作成";
  }
};

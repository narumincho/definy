import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const Home = (prop: { model: Model }): VNode => {
  return h("div", { class: "home__root" }, [
    homeMain(prop),
    ...(prop.model.logInState._ === "Guest"
      ? []
      : [createProjectButton({ model: prop.model })]),
  ]);
};

const homeMain = (prop: { model: Model }): VNode => {
  return h("div", { class: "home__main" }, [
    h("div", { class: "home__link-list" }, [
      ui.link(
        {
          class: "home__link",
          areaTheme: "Gray",
          onJump: prop.model.onJump,
          urlData: { ...prop.model, location: d.Location.About },
        },
        ["Definyについて"]
      ),
      ui.link(
        {
          class: "home__link",
          areaTheme: "Gray",
          onJump: prop.model.onJump,
          urlData: { ...prop.model, location: d.Location.Debug },
        },
        ["デバッグページ"]
      ),
    ]),
    prop.model.allProjectIdListMaybe._ === "Just"
      ? AllProjectList({
          allProjectIdListResource: prop.model.allProjectIdListMaybe.value,
          model: prop.model,
        })
      : h("div", {}, ["..."]),
  ]);
};

const AllProjectList = (prop: {
  model: Model;
  allProjectIdListResource: d.ResourceState<ReadonlyArray<d.ProjectId>>;
}): VNode =>
  ui.commonResourceStateView({
    dataView: (allProjectIdList: ReadonlyArray<d.ProjectId>): VNode => {
      if (allProjectIdList.length === 0) {
        return h("div", {}, ["プロジェクトが1つもありません"]);
      }
      return h(
        "div",
        { class: "home__project-list" },
        allProjectIdList.map((projectId) =>
          ui.project({
            key: projectId,
            model: prop.model,
            projectId,
          })
        )
      );
    },

    resourceState: prop.allProjectIdListResource,
  });

const createProjectButton = (prop: { model: Model }): VNode =>
  h("div", { class: "home__create-project" }, [
    ui.link(
      {
        class: "home__create-project-link",
        areaTheme: "Active",
        onJump: prop.model.onJump,
        urlData: { ...prop.model, location: d.Location.CreateProject },
      },
      [createProjectMessage(prop.model.language)]
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

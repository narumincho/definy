import * as d from "definy-core/source/data";
import { VNode, h } from "maquette";
import { Model } from "../model";
import { commit } from "../Component/Project";
import { idea } from "../Component/Idea";

export type Page =
  | {
      _: "Project";
      projectId: d.ProjectId;
    }
  | {
      _: "Idea";
      ideaId: d.IdeaId;
    };

export const Project = (prop: { model: Model; page: Page }): VNode =>
  h("div", { class: "project__root" }, [
    ideaAndCommitTree(prop),
    projectContent({ model: prop.model, page: prop.page }),
  ]);

const ideaAndCommitTree = (prop: { model: Model; page: Page }): VNode => {
  const projectIdAndData = getProjectIdAndData(prop.model, prop.page);
  if (projectIdAndData !== undefined) {
    const ideaIdList = prop.model.projectIdeaIdMap.get(projectIdAndData.id);
    if (ideaIdList === undefined) {
      return h("div", { class: "project__idea-and-commit-tree" }, [
        "プロジェクトのアイデアを取得していない?",
      ]);
    }
    return h("div", { class: "project__idea-and-commit-tree" }, [
      h(
        "div",
        {
          class: "project__tree-link",
          areaTheme: "Gray",
          onJump: prop.model.onJump,
          urlData: {
            ...prop.model,
            location: d.Location.Project(projectIdAndData.id),
          },
        },
        ["プロジェクトページ"]
      ),
      ...ideaIdList.map((ideaId) =>
        h(
          "div",
          {
            class: "project__tree-link",
            areaTheme: "Gray",
            key: ideaId,
            onJump: prop.model.onJump,
            urlData: {
              ...prop.model,
              location: d.Location.Idea(ideaId),
            },
          },
          [ideaId]
        )
      ),
    ]);
  }

  return h("div", { class: "project__idea-and-commit-tree" }, [
    "プロジェクトの情報が不明",
  ]);
};

const getProjectIdAndData = (
  model: Model,
  page: Page
): d.IdAndData<d.ProjectId, d.Project> | undefined => {
  const projectId = getProjectId(model, page);
  if (projectId === undefined) {
    return undefined;
  }
  const projectResourceState = model.projectMap.get(projectId);
  if (
    projectResourceState === undefined ||
    projectResourceState._ !== "Loaded" ||
    projectResourceState.dataResource.dataMaybe._ === "Nothing"
  ) {
    return undefined;
  }
  return {
    id: projectId,
    data: projectResourceState.dataResource.dataMaybe.value,
  };
};

const getProjectId = (model: Model, page: Page): d.ProjectId | undefined => {
  switch (page._) {
    case "Project":
      return page.projectId;
    case "Idea": {
      const ideaData = model.ideaMap.get(page.ideaId);
      if (
        ideaData !== undefined &&
        ideaData._ === "Loaded" &&
        ideaData.dataResource.dataMaybe._ === "Just"
      ) {
        return ideaData.dataResource.dataMaybe.value.projectId;
      }
      return undefined;
    }
  }
};

const projectContent = (prop: { model: Model; page: Page }): VNode => {
  switch (prop.page._) {
    case "Idea":
      return idea({ model: prop.model, ideaId: prop.page.ideaId });
    case "Project":
      return commit({ model: prop.model, projectId: prop.page.projectId });
  }
};

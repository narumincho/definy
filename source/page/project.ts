import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { ModelInterface } from "../modelInterface";

export class Model {
  modelInterface: ModelInterface;

  projectId: d.ProjectId;

  constructor(modelInterface: ModelInterface, projectId: d.ProjectId) {
    this.modelInterface = modelInterface;
    this.projectId = projectId;

    this.modelInterface.requestProject(this.projectId);
    this.modelInterface.requestTypePartInProject(this.projectId);
  }

  addTypePart(): void {
    this.modelInterface.addTypePart(this.projectId);
  }
}

export type Page =
  | {
      _: "Project";
      projectId: d.ProjectId;
    }
  | {
      _: "Idea";
      ideaId: d.IdeaId;
    };

export const view = (model: Model): VNode =>
  h("div", { class: "project__root", key: "project" }, [mainView(model)]);

export const mainView = (model: Model): VNode => {
  const projectResourceState = model.modelInterface.projectMap.get(
    model.projectId
  );
  return ui.commonResourceStateView({
    dataView: (project) =>
      detailView({
        model,
        project,
      }),
    resourceState: projectResourceState,
    key: "project-detail",
  });
};

export const detailView = (prop: {
  model: Model;
  project: d.Project;
}): VNode => {
  return h("div", { class: "commit__root", key: "project-detail" }, [
    h("h1", { class: "commit__project-name-and-icon" }, [
      ui.image({
        class: "commit__project-icon",
        imageToken: prop.project.iconHash,
        modelInterface: prop.model.modelInterface,
        key: "project-image",
      }),
      h("div", {}, [prop.project.name]),
    ]),
    ui.image({
      class: "commit__project-image",
      imageToken: prop.project.imageHash,
      modelInterface: prop.model.modelInterface,
      key: "project-icon",
    }),
    h("div", {}, [
      "作成者",
      ui.user({
        modelInterface: prop.model.modelInterface,
        userId: prop.project.createUserId,
      }),
    ]),
    typePartListEditor(prop.model),
  ]);
};

const typePartListEditor = (model: Model): VNode => {
  return h("div", { key: "typePartListEditor" }, [
    ...[...model.modelInterface.typePartMap]
      .filter(
        ([_, typePart]) =>
          typePart._ === "Loaded" &&
          typePart.dataResource.dataMaybe._ === "Just" &&
          typePart.dataResource.dataMaybe.value.projectId === model.projectId
      )
      .map(([typePartId, typePartResourceState]) =>
        ui.commonResourceStateView({
          dataView: (typePart) => {
            return h("div", { key: typePartId }, [typePart.name]);
          },
          resourceState: typePartResourceState,
          key: "typePartMap-" + typePartId,
        })
      ),
    ui.button(
      {
        onClick: model.addTypePart,
        key: "typePartAddButton",
      },
      ["型パーツ追加"]
    ),
  ]);
};

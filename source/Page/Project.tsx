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
  h("div", { class: "project__root" }, [mainView(model)]);

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
  });
};

export const detailView = (prop: {
  model: Model;
  project: d.Project;
}): VNode => {
  return h("div", { class: "commit__root" }, [
    h("h1", { class: "commit__project-name-and-icon" }, [
      ui.Image({
        className: "commit__project-icon",
        imageToken: prop.project.iconHash,
        modelInterface: prop.model.modelInterface,
      }),
      h("div", {}, [prop.project.name]),
    ]),
    ui.Image({
      className: "commit__project-image",
      imageToken: prop.project.imageHash,
      modelInterface: prop.model.modelInterface,
    }),
    h("div", {}, [
      "作成者",
      ui.User({
        modelInterface: prop.model.modelInterface,
        userId: prop.project.createUserId,
      }),
    ]),
    typePartListEditor(prop.model),
  ]);
};

const typePartListEditor = (model: Model): VNode => {
  return h("div", {}, [
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
        })
      ),
    ui.button(
      {
        onClick: model.addTypePart,
      },
      ["型パーツ追加"]
    ),
  ]);
};

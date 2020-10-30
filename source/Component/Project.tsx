import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const commit = (prop: {
  model: Model;
  projectId: d.ProjectId;
}): VNode => {
  const projectResourceState = prop.model.projectMap.get(prop.projectId);
  return ui.commonResourceStateView({
    dataView: (project) =>
      detailView({
        model: prop.model,
        project,
        projectId: prop.projectId,
      }),
    resourceState: projectResourceState,
  });
};

export const detailView = (prop: {
  model: Model;
  project: d.Project;
  projectId: d.ProjectId;
}): VNode => {
  return h("div", { class: "commit__root" }, [
    h("h1", { class: "commit__project-name-and-icon" }, [
      ui.Image({
        className: "commit__project-icon",
        imageToken: prop.project.iconHash,
        model: prop.model,
      }),
      h("div", {}, [prop.project.name]),
    ]),
    ui.Image({
      className: "commit__project-image",
      imageToken: prop.project.imageHash,
      model: prop.model,
    }),
    h("div", {}, [
      "作成者",
      ui.User({ model: prop.model, userId: prop.project.createUserId }),
    ]),
    typePartListEditor({ model: prop.model, projectId: prop.projectId }),
  ]);
};

const typePartListEditor = (prop: {
  model: Model;
  projectId: d.ProjectId;
}): VNode => {
  return h("div", {}, [
    ...[...prop.model.typePartMap]
      .filter(
        ([_, typePart]) =>
          typePart._ === "Loaded" &&
          typePart.dataResource.dataMaybe._ === "Just" &&
          typePart.dataResource.dataMaybe.value.projectId === prop.projectId
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
        onClick: () => {
          prop.model.addTypePart(prop.projectId);
        },
      },
      ["型パーツ追加"]
    ),
  ]);
};

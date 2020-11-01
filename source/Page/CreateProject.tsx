import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { ModelInterface } from "../modelInterface";

export class Model {
  projectName = "";

  isCreating = false;

  modelInterface: ModelInterface;

  constructor(modelInterface: ModelInterface) {
    this.modelInterface = modelInterface;
  }

  async createProject(): Promise<void> {
    const validProjectName = core.stringToValidProjectName(this.projectName);
    if (validProjectName === null) {
      return;
    }
    const newProjectId = await this.modelInterface.createProject(
      validProjectName
    );
    if (newProjectId === undefined) {
      return;
    }
    this.modelInterface.jumpSameLanguageLink(d.Location.Project(newProjectId));
  }

  setProjectName(newProjectName: string): void {
    this.projectName = newProjectName;
  }
}

export const view = (model: Model): VNode => {
  if (model.modelInterface.logInState._ !== "LoggedIn") {
    return h("div", { class: "create-project__root" }, [
      h("div", {}, ["プロジェクトの作成にはログインする必要があります"]),
      h("div", {}, ["左のログインボタンを押してログインしてください"]),
    ]);
  }

  if (model.isCreating) {
    return h("div", {}, [model.projectName + "を作成中"]);
  }

  const validProjectName = core.stringToValidProjectName(model.projectName);

  return h("div", { class: "create-project__root" }, [
    h("div", {}, [
      "ここはプロジェクト作成ページ.プロジェクト名と画像を指定してプロジェクトを作ることができます",
    ]),
    h("label", {}, ["プロジェクト名"]),
    h("div", {}, [
      validProjectName === null
        ? "プロジェクト名に使えません"
        : validProjectName,
    ]),
    ui.oneLineTextInput({
      name: "projectName",
      onChange: model.setProjectName,
      value: model.projectName,
    }),
    ui.button(
      {
        class: "create-project__button",
        onClick: validProjectName === null ? undefined : model.createProject,
      },
      ["プロジェクトを作成"]
    ),
  ]);
};

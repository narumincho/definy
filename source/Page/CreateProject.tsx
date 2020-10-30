import * as core from "definy-core";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

const createProjectComponent = (): ((prop: { model: Model }) => VNode) => {
  let projectName = "";

  const setProjectName = (value: string) => {
    projectName = value;
  };

  return (prop) => {
    if (prop.model.logInState._ !== "LoggedIn") {
      return h("div", { class: "create-project__root" }, [
        h("div", {}, ["プロジェクトの作成にはログインする必要があります"]),
        h("div", {}, ["左のログインボタンを押してログインしてください"]),
      ]);
    }

    switch (prop.model.createProjectState._) {
      case "WaitCreating":
      case "Creating":
        return h("div", {}, [
          prop.model.createProjectState.projectName + "を作成中",
        ]);
    }

    const validProjectName = core.stringToValidProjectName(projectName);

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
        onChange: setProjectName,
        value: projectName,
      }),
      ui.button(
        {
          class: "create-project__button",
          onClick:
            validProjectName === null
              ? undefined
              : () => {
                  prop.model.createProject(validProjectName);
                },
        },
        ["プロジェクトを作成"]
      ),
    ]);
  };
};

export const createProject = createProjectComponent();

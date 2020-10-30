import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const ideaComponent = (): ((prop: {
  model: Model;
  ideaId: d.IdeaId;
}) => VNode) => {
  let newIdeaName = "";
  const setNewIdeaName = (value: string) => {
    newIdeaName = value;
  };

  return (prop): VNode => {
    const idea = getIdea(prop.model, prop.ideaId);

    return h("div", { class: "idea__root" }, [
      h("h2", {}, [idea === undefined ? "???" : idea.name]),
      h("div", { class: "idea__section" }, [
        h("div", { class: "idea__section-title" }, ["マージ済みのコミット"]),
        h("div", {}, ["マージ済みのコミットの内容"]),
      ]),
      h("div", { class: "idea__section" }, [
        h("div", { class: "idea__section-title" }, ["子アイデア"]),
        h("div", {}, ["子アイデアの一覧"]),
        ...(prop.model.logInState._ === "LoggedIn"
          ? [
              h("div", {}, [
                ui.oneLineTextInput({
                  name: "newIdeaName",
                  onChange: setNewIdeaName,
                  value: newIdeaName,
                }),
                ui.button(
                  {
                    onClick:
                      idea === undefined
                        ? undefined
                        : () => {
                            prop.model.createIdea(newIdeaName, prop.ideaId);
                          },
                  },
                  ["+ 子アイデアを作成する"]
                ),
              ]),
            ]
          : []),
      ]),
      h("div", { class: "idea__section" }, [
        h("div", { class: "idea__section-title" }, ["コミット"]),
        h("div", {}, ["コミットの一覧"]),
        ...(prop.model.logInState._ === "LoggedIn"
          ? [ui.button({ onClick: () => {} }, ["+ コミットを作成する"])]
          : []),
      ]),
      h("div", { class: "idea__section" }, [
        h("div", { class: "idea__section-title" }, ["コメント"]),
        h("div", {}, ["コメントの内容"]),
      ]),
    ]);
  };
};

const getIdea = (model: Model, ideaId: d.IdeaId): d.Idea | undefined => {
  const ideaState = model.ideaMap.get(ideaId);
  if (ideaState === undefined) {
    return undefined;
  }
  switch (ideaState?._) {
    case "Loaded":
      if (ideaState.dataResource.dataMaybe._ === "Just") {
        return ideaState.dataResource.dataMaybe.value;
      }
      return undefined;
  }
  return undefined;
};

export const idea = ideaComponent();

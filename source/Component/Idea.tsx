import * as React from "react";
import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { Model } from "../model";
import styled from "styled-components";

const IdeaDiv = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  align-content: start;
  overflow-y: scroll;
`;

const IdeaSection = styled.div`
  padding: 8px;
`;

const SectionTitle = styled.div`
  font-size: 1.5rem;
`;

export const Idea: React.FC<{ model: Model; ideaId: d.IdeaId }> = (prop) => {
  const [newIdeaName, setNewIdeaName] = React.useState<string>("");
  const idea = getIdea(prop.model, prop.ideaId);

  return (
    <IdeaDiv>
      <h2>{idea === undefined ? "???" : idea.name}</h2>
      <IdeaSection>
        <SectionTitle>マージ済みのコミット</SectionTitle>
        <div>マージ済みのコミットの内容</div>
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>子アイデア</SectionTitle>
        <div>子アイデアの一覧</div>
        {prop.model.logInState._ === "LoggedIn" ? (
          <div>
            <ui.OneLineTextInput
              name="newIdeaName"
              onChange={(e) => setNewIdeaName(e.target.value)}
              value={newIdeaName}
            />
            <ui.Button
              onClick={
                idea === undefined
                  ? undefined
                  : () => {
                      prop.model.createIdea(newIdeaName, prop.ideaId);
                    }
              }
            >
              + 子アイデアを作成する
            </ui.Button>
          </div>
        ) : undefined}
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>コミット</SectionTitle>
        <div>コミットの一覧</div>
        {prop.model.logInState._ === "LoggedIn" ? (
          <ui.Button onClick={() => {}}>+ コミットを作成する</ui.Button>
        ) : undefined}
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>コメント</SectionTitle>
        <div>コメントの内容</div>
      </IdeaSection>
    </IdeaDiv>
  );
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

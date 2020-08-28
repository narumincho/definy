import * as React from "react";
import * as data from "definy-core/source/data";
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

export const Idea: React.FC<{ model: Model; ideaId: data.IdeaId }> = (prop) => {
  return (
    <IdeaDiv>
      <h2>{getIdeaName(prop.model, prop.ideaId)}</h2>
      <IdeaSection>
        <SectionTitle>マージ済みのコミット</SectionTitle>
        <div>マージ済みのコミットの内容</div>
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>子アイデア</SectionTitle>
        <div>子アイデアの一覧</div>
        <ui.Button onClick={() => {}}>+ 子アイデアを作成する</ui.Button>
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>コミット</SectionTitle>
        <div>コミットの一覧</div>
        <ui.Button onClick={() => {}}>+ コミットを作成する</ui.Button>
      </IdeaSection>
      <IdeaSection>
        <SectionTitle>コメント</SectionTitle>
        <div>コメントの内容</div>
      </IdeaSection>
    </IdeaDiv>
  );
};

const getIdeaName = (model: Model, ideaId: data.IdeaId): string => {
  const ideaState = model.ideaMap.get(ideaId);
  if (ideaState === undefined) {
    return "???";
  }
  switch (ideaState?._) {
    case "Loaded":
      if (ideaState.dataResource.dataMaybe._ === "Just") {
        return ideaState.dataResource.dataMaybe.value.name;
      }
      return "このアイデアは存在しない";
  }
  return "??";
};

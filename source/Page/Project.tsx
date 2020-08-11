import * as ui from "../ui";
import { IdeaId, Location, ProjectId } from "definy-core/source/data";
import { Idea as IdeaComponent } from "../Component/Idea";
import { Model } from "../model";
import { Project as ProjectComponent } from "../Component/Project";
import React from "react";
import styled from "styled-components";

const ProjectDiv = styled.div({
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
});

export type Page =
  | {
      _: "Project";
      projectId: ProjectId;
    }
  | {
      _: "Idea";
      ideaId: IdeaId;
    };

export const Project: React.FC<{ model: Model; page: Page }> = (prop) => {
  // const projectResourceState = prop.model.projectMap.get(prop.projectId);

  React.useEffect(() => {
    switch (prop.page._) {
      case "Project":
        prop.model.requestProject(prop.page.projectId);
        prop.model.requestProjectIdea(prop.page.projectId);
    }
  }, []);
  return (
    <ProjectDiv>
      <IdeaAndCommitTree model={prop.model} page={prop.page} />
      <ProjectContent model={prop.model} page={prop.page} />
    </ProjectDiv>
  );
};

const IdeaAndCommitTreeDiv = styled.div({
  overflowY: "scroll",
  height: "100%",
  width: 320,
  display: "grid",
  alignItems: "start",
  alignContent: "start",
});

const IdeaAndCommitTree: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  if (prop.page._ === "Project") {
    const ideaIdList = prop.model.projectIdeaIdMap.get(prop.page.projectId);
    if (ideaIdList === undefined) {
      return (
        <IdeaAndCommitTreeDiv>
          プロジェクトのアイデアを取得していない?
        </IdeaAndCommitTreeDiv>
      );
    }
    return (
      <IdeaAndCommitTreeDiv>
        <div>プロジェクトのページ</div>
        {ideaIdList.map((ideaId) => (
          <ui.Link
            areaTheme="Gray"
            key={ideaId}
            onJump={prop.model.onJump}
            urlData={{
              ...prop.model,
              location: Location.Idea(ideaId),
            }}
          >
            {ideaId}
          </ui.Link>
        ))}
      </IdeaAndCommitTreeDiv>
    );
  }

  return (
    <IdeaAndCommitTreeDiv>プロジェクトIDがわからない</IdeaAndCommitTreeDiv>
  );
};

const ProjectContent: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  switch (prop.page._) {
    case "Idea":
      return <IdeaComponent model={prop.model} />;
    case "Project":
      return (
        <ProjectComponent model={prop.model} projectId={prop.page.projectId} />
      );
  }
};

import * as d from "definy-core/source/data";
import * as ui from "../ui";
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
      projectId: d.ProjectId;
    }
  | {
      _: "Idea";
      ideaId: d.IdeaId;
    };

export const Project: React.FC<{ model: Model; page: Page }> = (prop) => {
  // const projectResourceState = prop.model.projectMap.get(prop.projectId);

  React.useEffect(() => {
    switch (prop.page._) {
      case "Project":
        prop.model.requestProject(prop.page.projectId);
        prop.model.requestProjectIdea(prop.page.projectId);
        return;
      case "Idea":
        prop.model.requestIdea(prop.page.ideaId);
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
});

const TreeLink = styled(ui.Link)({
  padding: 8,
  overflowX: "hidden",
});

const IdeaAndCommitTree: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  const projectIdAndData = getProjectIdAndData(prop.model, prop.page);
  if (projectIdAndData !== undefined) {
    const ideaIdList = prop.model.projectIdeaIdMap.get(projectIdAndData.id);
    if (ideaIdList === undefined) {
      return (
        <IdeaAndCommitTreeDiv>
          プロジェクトのアイデアを取得していない?
        </IdeaAndCommitTreeDiv>
      );
    }
    return (
      <IdeaAndCommitTreeDiv>
        <TreeLink
          areaTheme="Gray"
          onJump={prop.model.onJump}
          urlData={{
            ...prop.model,
            location: d.Location.Project(projectIdAndData.id),
          }}
        >
          プロジェクトページ
        </TreeLink>
        {ideaIdList.map((ideaId) => (
          <TreeLink
            areaTheme="Gray"
            key={ideaId}
            onJump={prop.model.onJump}
            urlData={{
              ...prop.model,
              location: d.Location.Idea(ideaId),
            }}
          >
            {ideaId}
          </TreeLink>
        ))}
      </IdeaAndCommitTreeDiv>
    );
  }

  return <IdeaAndCommitTreeDiv>プロジェクトの情報が不明</IdeaAndCommitTreeDiv>;
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
      const idea = model.ideaMap.get(page.ideaId);
      if (
        idea !== undefined &&
        idea._ === "Loaded" &&
        idea.dataResource.dataMaybe._ === "Just"
      ) {
        return idea.dataResource.dataMaybe.value.projectId;
      }
      return undefined;
    }
  }
};

const ProjectContent: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  switch (prop.page._) {
    case "Idea":
      return <IdeaComponent ideaId={prop.page.ideaId} model={prop.model} />;
    case "Project":
      return (
        <ProjectComponent model={prop.model} projectId={prop.page.projectId} />
      );
  }
};

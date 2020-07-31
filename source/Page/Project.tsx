import * as ui from "../ui";
import { Project as ProjectData, ProjectId } from "definy-core/source/data";
import { Model } from "../model";
import React from "react";
import styled from "styled-components";

const ProjectDiv = styled.div({
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
});

const ProjectNameAndIcon = styled.h1({
  padding: 8,
  display: "grid",
  alignItems: "center",
  gridTemplateColumns: "48px 1fr",
  gap: 8,
  width: "100%",
  margin: 0,
});

export const Project: React.FC<{ model: Model; projectId: ProjectId }> = (
  prop
) => {
  const projectResourceState = prop.model.projectMap.get(prop.projectId);

  React.useEffect(() => {
    prop.model.requestProject(prop.projectId);
  }, []);
  if (
    projectResourceState?._ === "Loaded" &&
    projectResourceState?.dataResource.dataMaybe._ === "Just"
  ) {
    const project = projectResourceState.dataResource.dataMaybe.value;
    return (
      <ProjectDiv>
        <IdeaAndCommitTree
          model={prop.model}
          project={project}
          projectId={prop.projectId}
        />
        <ProjectContent
          model={prop.model}
          project={project}
          projectId={prop.projectId}
        />
      </ProjectDiv>
    );
  }
  return <ui.CommonResourceStateView resourceState={projectResourceState} />;
};

const IdeaAndCommitTreeDiv = styled.div({
  overflowY: "scroll",
  height: "100%",
  width: 320,
});

const IdeaAndCommitTree: React.FC<{
  model: Model;
  projectId: ProjectId;
  project: ProjectData;
}> = () => {
  return (
    <IdeaAndCommitTreeDiv>
      <svg viewBox="0 0 320 2000">
        <line stroke="#00ff00" x1={5} x2={2} y1={0} y2={2000} />
        <circle cx={5} cy={20} fill="white" r={5} stroke="#00ff00" />
        <line stroke="#00ff00" x1={10} x2={15} y1={20} y2={20} />
      </svg>
    </IdeaAndCommitTreeDiv>
  );
};

const ProjectContentDiv = styled.div({
  padding: 16,
});

const ProjectContent: React.FC<{
  model: Model;
  projectId: ProjectId;
  project: ProjectData;
}> = (prop) => {
  return (
    <ProjectContentDiv>
      <ProjectNameAndIcon>
        <ui.Image
          imageStyle={{
            width: 48,
            height: 48,
            padding: 0,
            round: false,
          }}
          imageToken={prop.project.iconHash}
          model={prop.model}
        />
        <div>{prop.project.name}</div>
      </ProjectNameAndIcon>
      <ui.Image
        imageStyle={{
          width: 512,
          height: 633 / 2,
          padding: 0,
          round: false,
        }}
        imageToken={prop.project.imageHash}
        model={prop.model}
      />
      <div>
        作成者
        <ui.User model={prop.model} userId={prop.project.createUserId} />
      </div>
    </ProjectContentDiv>
  );
};

import * as ui from "../ui";
import { Project as ProjectData, ProjectId } from "definy-core/source/data";
import { Model } from "../model";
import React from "react";
import styled from "styled-components";

const ProjectContentDiv = styled.div({
  padding: 16,
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

export const Project: React.FC<{
  model: Model;
  projectId: ProjectId;
}> = (prop) => {
  const projectResourceState = prop.model.projectMap.get(prop.projectId);
  if (
    projectResourceState?._ === "Loaded" &&
    projectResourceState.dataResource.dataMaybe._ === "Just"
  ) {
    return (
      <ProjectDetailView
        model={prop.model}
        project={projectResourceState.dataResource.dataMaybe.value}
      />
    );
  }
  return <ui.CommonResourceStateView resourceState={projectResourceState} />;
};

export const ProjectDetailView: React.FC<{
  model: Model;
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

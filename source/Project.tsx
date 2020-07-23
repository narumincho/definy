import * as ui from "./ui";
import { Model } from "./model";
import { ProjectId } from "definy-core/source/data";
import React from "react";
import styled from "styled-components";

const ProjectDiv = styled.div({
  padding: 16,
  display: "grid",
  justifyItems: "center",
  alignContent: "start",
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
        <ProjectNameAndIcon>
          <ui.Image
            imageStyle={{
              width: 48,
              height: 48,
              padding: 0,
              round: false,
            }}
            imageToken={project.iconHash}
            model={prop.model}
          />
          <div>{project.name}</div>
        </ProjectNameAndIcon>
        <ui.Image
          imageStyle={{
            width: 512,
            height: 633 / 2,
            padding: 0,
            round: false,
          }}
          imageToken={project.imageHash}
          model={prop.model}
        />
        <div>
          作成者
          <ui.User model={prop.model} userId={project.createUserId} />
        </div>
      </ProjectDiv>
    );
  }
  return <ui.CommonResourceStateView resourceState={projectResourceState} />;
};

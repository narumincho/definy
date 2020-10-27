import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { Model } from "../model";
import React from "react";
import styled from "styled-components";

const ProjectContentDiv = styled.div`
  padding: 16px;
  display: grid;
  gap: 4px;
  align-content: start;
`;

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
  projectId: d.ProjectId;
}> = (prop) => {
  React.useEffect(() => {
    prop.model.requestTypePartListInProject(prop.projectId);
  }, []);

  const projectResourceState = prop.model.projectMap.get(prop.projectId);
  return ui.CommonResourceStateView({
    dataView: (project) => (
      <ProjectDetailView
        model={prop.model}
        project={project}
        projectId={prop.projectId}
      />
    ),
    resourceState: projectResourceState,
  });
};

export const ProjectDetailView: React.FC<{
  model: Model;
  project: d.Project;
  projectId: d.ProjectId;
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
      <TypePartListEditor model={prop.model} projectId={prop.projectId} />
    </ProjectContentDiv>
  );
};

const TypePartListEditor: React.FC<{
  model: Model;
  projectId: d.ProjectId;
}> = (prop) => {
  return (
    <div>
      {[...prop.model.typePartMap]
        .filter(
          ([_, typePart]) =>
            typePart._ === "Loaded" &&
            typePart.dataResource.dataMaybe._ === "Just" &&
            typePart.dataResource.dataMaybe.value.projectId === prop.projectId
        )
        .map(([typePartId, typePartResourceState]) =>
          ui.CommonResourceStateView({
            dataView: (typePart) => {
              return <div key={typePartId}>{typePart.name}</div>;
            },
            resourceState: typePartResourceState,
          })
        )}
      <ui.Button
        onClick={() => {
          prop.model.addTypePart(prop.projectId);
        }}
      >
        型パーツ追加
      </ui.Button>
    </div>
  );
};

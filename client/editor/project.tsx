import * as React from "react";
import * as d from "../../data";
import { ElementOperation } from "./commonElement";
import { ProjectCard } from "../ui/ProjectCard";

/** プロジェクト内の要素を選択することはなさそう */
export type ProjectSelection = never;

export type ProjectValue = d.ProjectId;

export type ProjectType = {
  readonly canEdit: boolean;
};

const ProjectSelectionView: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType
>["selectionView"] = (props) => {
  return (
    <ProjectCard
      getProject={props.getProject}
      projectId={props.value}
      language={props.language}
      onJump={props.onJump}
      onRequestProjectById={props.onRequestProject}
    />
  );
};

const ProjectDetailView: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType
>["detailView"] = (props) => {
  return (
    <ProjectCard
      getProject={props.getProject}
      projectId={props.value}
      language={props.language}
      onJump={props.onJump}
      onRequestProjectById={props.onRequestProject}
    />
  );
};

export const projectOperation: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectSelectionView,
  detailView: ProjectDetailView,
};

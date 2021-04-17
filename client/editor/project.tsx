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

export type ProjectDataOperation = {
  tag: "jump";
};

const ProjectSelectionView: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType,
  ProjectDataOperation
>["selectionView"] = (props) => {
  return (
    <ProjectCard
      projectResource={props.projectResource}
      projectId={props.value}
      language={props.language}
      onJump={props.onJump}
    />
  );
};

const ProjectDetailView: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType,
  ProjectDataOperation
>["detailView"] = (props) => {
  return (
    <ProjectCard
      projectResource={props.projectResource}
      projectId={props.value}
      language={props.language}
      onJump={props.onJump}
    />
  );
};

export const projectOperation: ElementOperation<
  ProjectSelection,
  ProjectValue,
  ProjectType,
  ProjectDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectSelectionView,
  detailView: ProjectDetailView,
};

import * as React from "react";
import * as d from "../../data";
import type { ElementOperation } from "./ElementOperation";
import { ProjectCard } from "../ui/ProjectCard";

/** プロジェクト内の要素を選択することはなさそう */
export type ProjectIdSelection = never;

export type ProjectIdValue = d.ProjectId;

export type ProjectIdType = {
  readonly canEdit: boolean;
};

export type ProjectIdDataOperation = {
  tag: "jump";
};

const ProjectIdSelectionView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdType,
  ProjectIdDataOperation
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

const ProjectIdDetailView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdType,
  ProjectIdDataOperation
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

export const projectIdOperation: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdType,
  ProjectIdDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectIdSelectionView,
  detailView: ProjectIdDetailView,
};

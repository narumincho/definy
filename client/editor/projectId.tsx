import * as React from "react";
import * as d from "../../data";
import type { ElementOperation } from "./ElementOperation";
import { ProjectCard } from "../ui/ProjectCard";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

/** プロジェクト内の要素を選択することはなさそう */
export type ProjectIdSelection = never;

export type ProjectIdValue = {
  readonly projectId: d.ProjectId;
  readonly canEdit: boolean;
} & Pick<UseDefinyAppResult, "projectResource" | "language" | "jump">;

export type ProjectIdDataOperation = {
  tag: "jump";
};

const ProjectIdSelectionView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdDataOperation
>["selectionView"] = (props) => {
  return (
    <ProjectCard
      projectResource={props.value.projectResource}
      projectId={props.value.projectId}
      language={props.value.language}
      onJump={props.value.jump}
    />
  );
};

const ProjectIdDetailView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdDataOperation
>["detailView"] = (props) => {
  return (
    <ProjectCard
      projectResource={props.value.projectResource}
      projectId={props.value.projectId}
      language={props.value.language}
      onJump={props.value.jump}
    />
  );
};

export const projectIdOperation: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue,
  ProjectIdDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectIdSelectionView,
  detailView: ProjectIdDetailView,
};

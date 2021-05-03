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

const ProjectIdSelectionView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue
>["selectionView"] = React.memo((props) => {
  return (
    <ProjectCard
      projectResource={props.value.projectResource}
      projectId={props.value.projectId}
      language={props.value.language}
      onJump={props.value.jump}
    />
  );
});
ProjectIdSelectionView.displayName = "ProjectIdSelectionView";

const ProjectIdDetailView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue
>["detailView"] = React.memo((props) => {
  return (
    <ProjectCard
      projectResource={props.value.projectResource}
      projectId={props.value.projectId}
      language={props.value.language}
      onJump={props.value.jump}
    />
  );
});
ProjectIdDetailView.displayName = "ProjectIdDetailView";

export const projectIdOperation: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectIdSelectionView,
  detailView: ProjectIdDetailView,
};

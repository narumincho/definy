import * as React from "react";
import * as d from "../../localData";
import type { ElementOperation } from "./ElementOperation";
import { ProjectCard } from "../ui/ProjectCard";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { neverFunc } from "../../common/util";

/** プロジェクト内の要素を選択することはなさそう */
export type ProjectIdSelection = never;

export type ProjectIdValue = {
  readonly projectId: d.ProjectId;
  readonly canEdit: boolean;
  readonly language: d.Language;
} & Pick<UseDefinyAppResult, "projectResource">;

const ProjectIdSelectionView: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue
>["selectionView"] = React.memo((props) => {
  return (
    <ProjectCard
      projectResource={props.value.projectResource}
      projectId={props.value.projectId}
      language={props.value.language}
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
    />
  );
});
ProjectIdDetailView.displayName = "ProjectIdDetailView";

export const projectIdOperation: ElementOperation<
  ProjectIdSelection,
  ProjectIdValue
> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: ProjectIdSelectionView,
  detailView: ProjectIdDetailView,
};

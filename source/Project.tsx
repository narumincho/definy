import * as ui from "./ui";
import { Model } from "./model";
import { ProjectId } from "definy-core/source/data";
import React from "react";

export const Project: React.FC<{ model: Model; projectId: ProjectId }> = (
  prop
) => {
  return (
    <div>
      プロジェクトの詳細ページ
      <ui.Project model={prop.model} projectId={prop.projectId} />
    </div>
  );
};

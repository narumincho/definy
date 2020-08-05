import * as React from "react";
import * as ui from "../ui";
import { Model } from "../model";
import { ProjectId } from "definy-core/source/data";
import styled from "styled-components";

const ProjectIdeaDiv = styled.div({
  display: "grid",
  gridAutoFlow: "row",
  gap: 8,
});

export const ProjectIdea: React.FC<{ model: Model; projectId: ProjectId }> = (
  prop
) => {
  const [projectGoal, setProjectGoal] = React.useState<string>("");
  const [ideaName, setIdeaName] = React.useState<string>("");

  return (
    <ProjectIdeaDiv>
      <label>
        <div>プロジェクトの目標</div>
        <ui.OneLineTextInput
          name="project-goal"
          onChange={(event) => setProjectGoal(event.target.value)}
          value={projectGoal}
        />
      </label>
      <label>
        <div>プロジェクトの目標に対するアイデアの作成</div>
        <ui.OneLineTextInput
          name="idea-name"
          onChange={(event) => setIdeaName(event.target.value)}
          value={ideaName}
        />
      </label>
      <ui.Button
        onClick={() => {
          prop.model.createIdea(ideaName, prop.projectId);
        }}
      >
        アイデアの作成
      </ui.Button>
      いま時点のマージされたコミットを見ることができる
    </ProjectIdeaDiv>
  );
};

import * as React from "react";
import * as ui from "../ui";
import { Model } from "../model";
import styled from "styled-components";

const ProjectIdeaDiv = styled.div({
  display: "grid",
  gridAutoFlow: "row",
  gap: 8,
});

export const ProjectIdea: React.FC<{ model: Model }> = () => {
  const [projectGoal, setProjectGoal] = React.useState<string>("");

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
      <ui.Button onClick={() => {}}>アイデアの作成</ui.Button>
      いま時点のマージされたコミットを見ることができる
    </ProjectIdeaDiv>
  );
};

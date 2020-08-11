import * as ui from "../ui";
import { IdeaId, Location, ProjectId } from "definy-core/source/data";
import { Idea as IdeaComponent } from "../Component/Idea";
import { Model } from "../model";
import React from "react";
import styled from "styled-components";

const ProjectDiv = styled.div({
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
});

const ProjectNameAndIcon = styled.h1({
  padding: 8,
  display: "grid",
  alignItems: "center",
  gridTemplateColumns: "48px 1fr",
  gap: 8,
  width: "100%",
  margin: 0,
});

export type Page =
  | {
      _: "Project";
      projectId: ProjectId;
    }
  | {
      _: "Idea";
      ideaId: IdeaId;
    };

export const Project: React.FC<{ model: Model; page: Page }> = (prop) => {
  // const projectResourceState = prop.model.projectMap.get(prop.projectId);

  React.useEffect(() => {
    switch (prop.page._) {
      case "Project":
        prop.model.requestProject(prop.page.projectId);
        prop.model.requestProjectIdea(prop.page.projectId);
    }
  }, []);
  /*
   * if (
   *   projectResourceState?._ === "Loaded" &&
   *   projectResourceState?.dataResource.dataMaybe._ === "Just"
   * ) {
   * const project = projectResourceState.dataResource.dataMaybe.value;
   */
  return (
    <ProjectDiv>
      <IdeaAndCommitTree model={prop.model} page={prop.page} />
      <ProjectContent model={prop.model} page={prop.page} />
    </ProjectDiv>
  );
  /*
   * }
   * return <ui.CommonResourceStateView resourceState={projectResourceState} />;
   */
};

const IdeaAndCommitTreeDiv = styled.div({
  overflowY: "scroll",
  height: "100%",
  width: 320,
  display: "grid",
  alignItems: "start",
});

const IdeaAndCommitTree: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  if (prop.page._ === "Project") {
    const ideaIdList = prop.model.projectIdeaIdMap.get(prop.page.projectId);
    if (ideaIdList === undefined) {
      return (
        <IdeaAndCommitTreeDiv>
          プロジェクトのアイデアを取得していない?
        </IdeaAndCommitTreeDiv>
      );
    }
    return (
      <IdeaAndCommitTreeDiv>
        {ideaIdList.map((ideaId) => (
          <ui.Link
            areaTheme="Gray"
            key={ideaId}
            onJump={prop.model.onJump}
            urlData={{
              ...prop.model,
              location: Location.Idea(ideaId),
            }}
          >
            {ideaId}
          </ui.Link>
        ))}
      </IdeaAndCommitTreeDiv>
    );
  }

  return (
    <IdeaAndCommitTreeDiv>プロジェクトIDがわからない</IdeaAndCommitTreeDiv>
  );
};

const ProjectContentDiv = styled.div({
  padding: 16,
});

const ProjectContent: React.FC<{
  model: Model;
  page: Page;
}> = (prop) => {
  switch (prop.page._) {
    case "Idea":
      return <IdeaComponent model={prop.model} />;
    case "Project":
      return <div>プロジェクトのルートアイデアを表示しなきゃな</div>;
  }
  /*
   * return (
   *   <ProjectContentDiv>
   *     <ProjectNameAndIcon>
   *       <ui.Image
   *         imageStyle={{
   *           width: 48,
   *           height: 48,
   *           padding: 0,
   *           round: false,
   *         }}
   *         imageToken={prop.project.iconHash}
   *         model={prop.model}
   *       />
   *       <div>{prop.project.name}</div>
   *     </ProjectNameAndIcon>
   *     <ui.Image
   *       imageStyle={{
   *         width: 512,
   *         height: 633 / 2,
   *         padding: 0,
   *         round: false,
   *       }}
   *       imageToken={prop.project.imageHash}
   *       model={prop.model}
   *     />
   *     <div>
   *       作成者
   *       <ui.User model={prop.model} userId={prop.project.createUserId} />
   *     </div>
   *   </ProjectContentDiv>
   * );
   */
};

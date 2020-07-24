import * as React from "react";
import * as ui from "../ui";
import {
  Language,
  Location,
  ProjectId,
  ResourceState,
} from "definy-core/source/data";
import { Model } from "../model";
import styled from "styled-components";

const HomeContainerDiv = styled.div({
  display: "grid",
  overflow: "hidden",
});

export const Home: React.FC<{ model: Model }> = (prop) => {
  React.useEffect(() => {
    if (prop.model.allProjectIdListMaybe._ === "Nothing") {
      prop.model.requestAllProject();
    }
  }, [prop.model.projectMap]);

  return (
    <HomeContainerDiv>
      <HomeMain model={prop.model} />
      {prop.model.logInState._ === "Guest" ? undefined : (
        <CreateProjectButton model={prop.model} />
      )}
    </HomeContainerDiv>
  );
};

const HomeMain: React.FC<{ model: Model }> = (prop) => {
  return (
    <MainContainerDiv>
      <HomeLinkContainerDiv>
        <HomeLinkDiv
          areaTheme="Gray"
          onJump={prop.model.onJump}
          urlData={{ ...prop.model, location: Location.About }}
        >
          Definyについて
        </HomeLinkDiv>
        <HomeLinkDiv
          areaTheme="Gray"
          onJump={prop.model.onJump}
          urlData={{ ...prop.model, location: Location.Debug }}
        >
          デバッグページ
        </HomeLinkDiv>
      </HomeLinkContainerDiv>
      {prop.model.allProjectIdListMaybe._ === "Just" ? (
        <AllProjectList
          allProjectIdListResource={prop.model.allProjectIdListMaybe.value}
          model={prop.model}
        />
      ) : (
        <div>...</div>
      )}
    </MainContainerDiv>
  );
};

const HomeLinkContainerDiv = styled.div({
  display: "grid",
  gridAutoFlow: "column",
  justifyContent: "end",
  alignItems: "center",
  height: 32,
  gap: 8,
});

const HomeLinkDiv = styled(ui.Link)({
  width: 128,
  height: 32,
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
});

const MainContainerDiv = styled.div({
  display: "grid",
  overflowY: "scroll",
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  gridTemplateRows: "32px 1fr",
  gap: 8,
  padding: 16,
});

const AllProjectList: React.FC<{
  model: Model;
  allProjectIdListResource: ResourceState<ReadonlyArray<ProjectId>>;
}> = (prop) => {
  if (
    prop.allProjectIdListResource._ === "Loaded" &&
    prop.allProjectIdListResource.dataResource.dataMaybe._ === "Just"
  ) {
    const allProjectList =
      prop.allProjectIdListResource.dataResource.dataMaybe.value;
    if (allProjectList.length === 0) {
      return <div>プロジェクトが1つもありません</div>;
    }
    return (
      <ProjectListContainerDiv>
        {allProjectList.map((projectId) => (
          <ui.Project
            key={projectId}
            model={prop.model}
            projectId={projectId}
          />
        ))}
      </ProjectListContainerDiv>
    );
  }
  return (
    <ui.CommonResourceStateView resourceState={prop.allProjectIdListResource} />
  );
};
const ProjectListContainerDiv = styled.div({
  overflow: "hidden",
  overflowWrap: "break-word",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  alignSelf: "start",
  justifySelf: "center",
  gap: 8,
});

const CreateProjectDiv = styled.div({
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  alignSelf: "end",
  justifySelf: "end",
  padding: 16,
});

const CreateProjectLink = styled(ui.Link)({ padding: 8 });

const CreateProjectButton: React.FC<{ model: Model }> = (prop) => (
  <CreateProjectDiv>
    <CreateProjectLink
      areaTheme="Active"
      onJump={prop.model.onJump}
      urlData={{ ...prop.model, location: Location.CreateProject }}
    >
      {createProjectMessage(prop.model.language)}
    </CreateProjectLink>
  </CreateProjectDiv>
);

const createProjectMessage = (language: Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "プロジェクトを新規作成";
  }
};

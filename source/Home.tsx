/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { Language, Location, ProjectId } from "definy-common/source/data";
import { Model } from "./model";
import { Resource } from "./data";
import { jsx } from "react-free-style";

export const Home: React.FC<{ model: Model }> = (prop) => {
  React.useEffect(() => {
    if (prop.model.allProjectIdListMaybe._ === "Nothing") {
      prop.model.requestAllProject();
    }
  }, [prop.model.projectData]);

  return (
    <div css={{ display: "grid", overflow: "hidden" }}>
      <div css={{ display: "grid", overflowY: "scroll" }}>
        {prop.model.allProjectIdListMaybe._ === "Just" ? (
          <AllProjectList
            allProjectIdListResource={prop.model.allProjectIdListMaybe.value}
            model={prop.model}
          />
        ) : (
          <LoadingDummyView />
        )}
      </div>
      {prop.model.logInState._ === "Guest" ? undefined : (
        <CreateProjectButton model={prop.model} />
      )}
    </div>
  );
};

const LoadingDummyView: React.FC<Record<never, never>> = () => {
  const grayTheme = ui.areaThemeToValue("Gray");
  return (
    <div
      css={{
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        overflow: "hidden",
        overflowWrap: "break-word",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignSelf: "start",
        justifySelf: "center",
        gap: 8,
      }}
    >
      {new Array(30).fill(0).map((_, index) => (
        <div
          css={{
            padding: 8,
            display: "grid",
            gridTemplateRows: "128px auto",
            width: 256,
            backgroundColor: grayTheme.backgroundColor,
            color: grayTheme.color,
          }}
          key={index.toString()}
        >
          <div css={{ backgroundColor: "#555" }} />
          <div>●●●● ●●● ●●●●</div>
        </div>
      ))}
    </div>
  );
};

const AllProjectList: React.FC<{
  model: Model;
  allProjectIdListResource: Resource<ReadonlyArray<ProjectId>>;
}> = (prop) =>
  ui.resourceView(
    prop.allProjectIdListResource,
    { width: "100%", height: "100%" },
    (allProjectList) => {
      if (allProjectList.length === 0) {
        return <div>プロジェクトが1つもありません</div>;
      }
      return (
        <div
          css={{
            gridColumn: "1 / 2",
            gridRow: "1 / 2",
            overflow: "hidden",
            overflowWrap: "break-word",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignSelf: "start",
            justifySelf: "center",
            gap: 8,
          }}
        >
          {allProjectList.map((projectId) => (
            <ui.Project
              key={projectId}
              model={prop.model}
              projectId={projectId}
            />
          ))}
        </div>
      );
    }
  );

const CreateProjectButton: React.FC<{ model: Model }> = (prop) => (
  <div
    css={{
      gridColumn: "1 / 2",
      gridRow: "1 / 2",
      alignSelf: "end",
      justifySelf: "end",
      padding: 16,
    }}
  >
    <ui.Link
      areaTheme="Active"
      css={{
        padding: 8,
      }}
      onJump={prop.model.onJump}
      urlData={{ ...prop.model, location: Location.CreateProject }}
    >
      {createProjectMessage(prop.model.language)}
    </ui.Link>
  </div>
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

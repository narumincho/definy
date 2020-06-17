/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import {
  Language,
  Location,
  Project,
  ProjectId,
} from "definy-common/source/data";
import { Model } from "./model";
import { jsx } from "react-free-style";

export const Home: React.FC<{ model: Model }> = (prop) => {
  React.useEffect(() => {
    switch (prop.model.allProjectRequestState) {
      case "NotRequest":
        prop.model.requestAllProject();
    }
  });

  return (
    <div css={{ display: "grid", overflow: "hidden" }}>
      <div css={{ display: "grid", overflowY: "scroll" }}>
        {prop.model.allProjectRequestState === "Respond" ? (
          <LoadedView model={prop.model} />
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
const LoadedView: React.FC<{ model: Model }> = (prop) => (
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
    {prop.model.projectData.size === 0
      ? "プロジェクトが1つもありません"
      : [...prop.model.projectData].map(([id, project]) => {
          switch (project._) {
            case "Loaded":
              return (
                <ProjectItem
                  id={id}
                  key={id}
                  model={prop.model}
                  project={project.data}
                />
              );
            case "Loading":
              return <div key={id}>id={id}</div>;
            case "NotFound":
              return (
                <div key={id}>id={id}のプロジェクトが見つからなかった</div>
              );
          }
        })}
  </div>
);

const ProjectItem: React.FC<{
  model: Model;
  id: ProjectId;
  project: Project;
}> = (prop) => (
  <ui.Link
    areaTheme="Gray"
    css={{
      padding: 8,
      display: "grid",
      gridTemplateRows: "128px auto",
      width: 256,
    }}
    onJump={prop.model.onJump}
    urlData={{ ...prop.model, location: Location.Project(prop.id) }}
  >
    <div css={{ border: "solid 1px white" }}>画像</div>
    <div
      css={{
        display: "grid",
        gridTemplateColumns: "32px 1fr",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div css={{ width: 32, height: 32, backgroundColor: "orange" }}>icon</div>
      {prop.project.name}
    </div>
  </ui.Link>
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

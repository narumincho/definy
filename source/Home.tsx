/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import {
  Language,
  Location,
  Maybe,
  Project,
  ProjectId,
} from "definy-common/source/data";
import { Model } from "./model";
import { Resource } from "./data";
import { jsx } from "react-free-style";

export const Home: React.FC<{ model: Model }> = (prop) => {
  React.useEffect(() => {
    console.log("called Home effect");
    if (prop.model.allProjectIdListMaybe._ === "Nothing") {
      prop.model.requestAllProject();
      return;
    }
    if (prop.model.allProjectIdListMaybe.value._ === "Loaded") {
      for (const id of prop.model.allProjectIdListMaybe.value.data) {
        const pData = prop.model.projectData.get(id);
        if (
          pData !== undefined &&
          pData._ === "Loaded" &&
          pData.data._ === "Just"
        ) {
          prop.model.requestImage(pData.data.value.imageHash);
          prop.model.requestImage(pData.data.value.iconHash);
        }
      }
    }
  }, [prop.model.projectData]);

  return (
    <div css={{ display: "grid", overflow: "hidden" }}>
      <div css={{ display: "grid", overflowY: "scroll" }}>
        {prop.model.allProjectIdListMaybe._ === "Just" ? (
          <LoadedView
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
const LoadedView: React.FC<{
  model: Model;
  allProjectIdListResource: Resource<ReadonlyArray<ProjectId>>;
}> = (prop) => {
  switch (prop.allProjectIdListResource._) {
    case "Loaded":
      if (prop.allProjectIdListResource.data.length === 0) {
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
          {[...prop.model.projectData].map(([id, resource]) => (
            <ProjectItem
              id={id}
              key={id}
              model={prop.model}
              resource={resource}
            />
          ))}
        </div>
      );
    case "Unknown":
      return <div>プロジェクトの一覧を取得できなかった</div>;
    case "WaitLoading":
      return <div>indexedDBから読み込み準備中……</div>;
    case "Loading":
      return <div>indexedDBから読み込み中……</div>;
    case "WaitRequesting":
      return <div>サーバーに問い合わせ待ち……</div>;
    case "Requesting":
      return <div>サーバーに問い合わせ中……</div>;
    case "WaitUpdating":
      return <div>更新準備中……</div>;
    case "Updating":
      return <div>更新中……</div>;
    case "WaitRetrying":
      return <div>再試行準備中……</div>;
    case "Retrying":
      return <div>再試行中……</div>;
  }
};

const ProjectItem: React.FC<{
  model: Model;
  id: ProjectId;
  resource: Resource<Maybe<Project>>;
}> = (prop) => {
  switch (prop.resource._) {
    case "Loaded":
      return (
        <ProjectLoadedItem
          id={prop.id}
          model={prop.model}
          projectMaybe={prop.resource.data}
        />
      );

    case "Unknown":
      return (
        <div>
          id={prop.id}のプロジェクトのデータに取得に失敗した. 存在するのかも不明
        </div>
      );
    case "WaitLoading":
      return <div>indexedDBから読み込み準備中……</div>;
    case "Loading":
      return <div>indexedDBから読み込み中……</div>;
    case "WaitRequesting":
      return <div>サーバーに問い合わせ待ち……</div>;
    case "Requesting":
      return <div>サーバーに問い合わせ中……</div>;
    case "WaitUpdating":
      return (
        <div>
          <div>更新準備中……</div>
          <ProjectLoadedItem
            id={prop.id}
            model={prop.model}
            projectMaybe={prop.resource.data}
          />
        </div>
      );
    case "Updating":
      return (
        <div>
          <div>更新中……</div>
          <ProjectLoadedItem
            id={prop.id}
            model={prop.model}
            projectMaybe={prop.resource.data}
          />
        </div>
      );
    case "WaitRetrying":
      return <div>再試行準備中……</div>;
    case "Retrying":
      return <div>再試行中……</div>;
  }
};

const ProjectLoadedItem: React.FC<{
  model: Model;
  id: ProjectId;
  projectMaybe: Maybe<Project>;
}> = (prop) => {
  if (prop.projectMaybe._ === "Nothing") {
    return <div>id={prop.id}のプロジェクトは存在しないようだ</div>;
  }
  const imageSrc: string | undefined = (() => {
    const iData = prop.model.imageData.get(prop.projectMaybe.value.imageHash);
    console.log({ iData });
    if (iData !== undefined && iData._ === "Loaded") {
      return iData.data;
    }
    return undefined;
  })();

  return (
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
      <img
        css={{ border: "solid 1px white", width: "100%", height: "100%" }}
        src={imageSrc}
      />
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "32px 1fr",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div css={{ width: 32, height: 32, backgroundColor: "orange" }}>
          icon
        </div>
        {prop.projectMaybe.value.name}
      </div>
    </ui.Link>
  );
};

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

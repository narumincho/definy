import * as React from "react";
import * as d from "../../data";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { Link } from "./Link";
import type { TopProjectsLoadingState } from "./App";
import { UseProjectDictResult } from "../hook/projectDict";
import { css } from "@emotion/css";

export type Props = {
  topProjectsLoadingState: TopProjectsLoadingState;
  useProjectDictResult: UseProjectDictResult;
  onJump: (urlData: d.UrlData) => void;
  language: d.Language;
  logInState: d.LogInState;
  accountDict: ReadonlyMap<d.AccountId, d.Account>;
  onRequestProjectById: (projectId: d.ProjectId) => void;
};

export const HomePage: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        overflowY: "scroll",
        gridTemplateRows: "32px 1fr",
        gap: 8,
        padding: 16,
        height: "100%",
      })}
    >
      <HomeLinkList jumpHandler={props.onJump} language={props.language} />
      <TopProjectList
        topProjectsLoadingState={props.topProjectsLoadingState}
        useProjectDictResult={props.useProjectDictResult}
        jumpHandler={props.onJump}
        language={props.language}
        onRequestProjectById={props.onRequestProjectById}
      />
      {props.logInState._ === "LoggedIn" ? (
        <CreateProjectButton language={props.language} onJump={props.onJump} />
      ) : (
        <></>
      )}
    </div>
  );
};

const HomeLinkList: React.VFC<{
  language: d.Language;
  jumpHandler: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <div
      className={css({
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      })}
    >
      <Link
        urlData={{ location: d.Location.About, language: props.language }}
        style={{ padding: 4 }}
        onJump={props.jumpHandler}
      >
        Definyについて
      </Link>
    </div>
  );
};

const TopProjectList: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
  useProjectDictResult: UseProjectDictResult;
  jumpHandler: (urlData: d.UrlData) => void;
  language: d.Language;
  onRequestProjectById: (projectId: d.ProjectId) => void;
}> = (props) => {
  switch (props.topProjectsLoadingState._) {
    case "none":
      return (
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
          })}
        >
          読み込み準備中
        </div>
      );
    case "loading":
      return (
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
            overflow: "hidden",
            overflowWrap: "break-word",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignSelf: "start",
            justifySelf: "center",
            gap: 8,
          })}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      );
    case "loaded":
      if (props.topProjectsLoadingState.projectIdList.length === 0) {
        return (
          <div
            className={css({
              gridColumn: "1 / 2",
              gridRow: "2 / 3",
              display: "grid",
              alignItems: "center",
              justifyItems: "center",
              fontSize: 32,
            })}
          >
            プロジェクトが1つも存在しない
          </div>
        );
      }
      return (
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
            overflow: "hidden",
            overflowWrap: "break-word",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignSelf: "start",
            justifySelf: "center",
            gap: 8,
          })}
        >
          {props.topProjectsLoadingState.projectIdList.map((projectId) => (
            <ProjectCard
              key={projectId}
              projectId={projectId}
              useProjectDictResult={props.useProjectDictResult}
              onJump={props.jumpHandler}
              language={props.language}
              onRequestProjectById={props.onRequestProjectById}
            />
          ))}
        </div>
      );
  }
};

const CreateProjectButton: React.VFC<{
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
}> = (props) => (
  <div
    className={css({
      gridColumn: "1 / 2",
      gridRow: "1 / 3",
      alignSelf: "end",
      justifySelf: "end",
      padding: 16,
    })}
  >
    <Link
      urlData={{
        language: props.language,
        location: d.Location.CreateProject,
      }}
      onJump={props.onJump}
      style={{ padding: 8 }}
      isActive
    >
      {createProjectMessage(props.language)}
    </Link>
  </div>
);

const createProjectMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "+ プロジェクトを新規作成";
  }
};

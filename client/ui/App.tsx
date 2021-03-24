import * as React from "react";
import * as d from "../../data";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { Link } from "./Link";
import { css } from "@emotion/css";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export const App: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
  jumpHandler: (urlData: d.UrlData) => void;
  urlData: d.UrlData;
}> = (props) => {
  return (
    <div
      className={css({
        height: "100%",
        display: "grid",
        overflow: "hidden",
        backgroundColor: "#222",
      })}
    >
      <div
        className={css({
          display: "grid",
          overflowY: "scroll",
          gridColumn: "1 / 2",
          gridRow: "1 / 2",
          gridTemplateRows: "32px 1fr",
          gap: 8,
          padding: 16,
        })}
      >
        <HomeLinkList
          jumpHandler={props.jumpHandler}
          language={props.urlData.language}
        />
        <TopProjectList
          topProjectsLoadingState={props.topProjectsLoadingState}
          projectDict={props.projectDict}
          jumpHandler={props.jumpHandler}
          language={props.urlData.language}
        />
      </div>
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
        jumpHandler={props.jumpHandler}
      >
        Definyについて
      </Link>
    </div>
  );
};

const TopProjectList: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
  jumpHandler: (urlData: d.UrlData) => void;
  language: d.Language;
}> = (props) => {
  switch (props.topProjectsLoadingState._) {
    case "none":
      return <div>読み込み準備中</div>;
    case "loading":
      return (
        <div
          className={css({
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
              projectDict={props.projectDict}
              jumpHandler={props.jumpHandler}
              language={props.language}
            />
          ))}
        </div>
      );
  }
};

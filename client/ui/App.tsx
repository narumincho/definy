import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export const App: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
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
        <HomeLinkList />
        <TopProjectList
          topProjectsLoadingState={props.topProjectsLoadingState}
        />
      </div>
    </div>
  );
};

const HomeLinkList: React.VFC<Record<string, never>> = () => {
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
      <a>Definyについて</a>
    </div>
  );
};

const TopProjectList: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
}> = (props) => {
  switch (props.topProjectsLoadingState._) {
    case "none":
      return <div>読み込み準備中</div>;
    case "loading":
      return <div>読込中</div>;
    case "loaded":
      return (
        <div>
          読み込み完了
          {JSON.stringify(props.topProjectsLoadingState.projectIdList)}
        </div>
      );
  }
};

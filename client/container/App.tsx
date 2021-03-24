import * as React from "react";
import * as d from "../../data";
import { api } from "../api";
import { css, injectGlobal } from "@emotion/css";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export const App: React.VFC<Record<string, never>> = () => {
  const [
    topProjectsLoadingState,
    setTopProjectsLoadingState,
  ] = React.useState<TopProjectsLoadingState>({ _: "none" });
  const [projectDict, setProjectDict] = React.useState<
    ReadonlyMap<d.ProjectId, d.Project>
  >(new Map());

  React.useEffect(() => {
    injectGlobal`
    #root {
      height: 100%;
    }
    `;
    setTopProjectsLoadingState({ _: "loading" });
    api.getTop50Project(undefined).then((response) => {
      if (response._ === "Nothing") {
        console.log("取得失敗");
        return;
      }
      setTopProjectsLoadingState({
        _: "loaded",
        projectIdList: response.value.data.map((project) => project.id),
      });
    });
    document.title =
      "Definy 手軽に堅牢なゲームとツールが作れて公開できる が目標のWebアプリ";
  }, []);
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
        <TopProjectList topProjectsLoadingState={topProjectsLoadingState} />
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

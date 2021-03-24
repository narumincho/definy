import * as React from "react";
import * as d from "../../data";
import { App as UiApp } from "../ui/App";
import { api } from "../api";

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
    <UiApp
      topProjectsLoadingState={topProjectsLoadingState}
      projectDict={projectDict}
    />
  );
};

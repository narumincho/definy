import * as React from "react";
import * as d from "../../data";
import { timeFromDate } from "../../core/util";

export type UseProjectDictResult = {
  /** キャッシュからプロジェクトの取得状況と内容を取得する `no effect` */
  getProjectStateByProjectId: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  /** 指定したプロジェクトの取得状態をリクエスト中にする  */
  setRequesting: (projectId: d.ProjectId) => void;
  /** 指定したプロジェクトの取得状態を不明(オフラインで取得不可など)にする  */
  setUnknown: (projectId: d.ProjectId) => void;
  /**
   * 指定したプロジェクトの取得状態を削除された, または存在しないにする
   * @param getTime 存在がないことが確認された時刻
   */
  setDeleted: (projectId: d.ProjectId, getTime: d.Time) => void;
  /** 指定したプロジェクトの取得状態を取得済みにしてキャッシュに保存する. useAPI 内や, storybookで使う */
  setLoaded: (
    projectList: ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>,
    getTime: d.Time
  ) => void;
};

export const useProjectDict = (): UseProjectDictResult => {
  const [projectDict, setProjectDict] = React.useState<
    ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>
  >(new Map());

  const setProjectState = (
    projectId: d.ProjectId,
    projectState: d.ResourceState<d.Project>
  ) => {
    setProjectDict((oldProjectDict) =>
      new Map(oldProjectDict).set(projectId, projectState)
    );
  };

  return {
    getProjectStateByProjectId: (projectId) => {
      return projectDict.get(projectId);
    },
    setRequesting: (projectId) => {
      setProjectState(projectId, d.ResourceState.Requesting());
    },
    setUnknown: (projectId) => {
      setProjectState(
        projectId,
        d.ResourceState.Unknown(timeFromDate(new Date()))
      );
    },
    setDeleted: (projectId, getTime) => {
      setProjectState(projectId, d.ResourceState.Deleted(getTime));
    },
    setLoaded: (projectList, getTime) => {
      setProjectDict((oldProjectDict) => {
        const dict = new Map(oldProjectDict);
        for (const projectIdAndData of projectList) {
          dict.set(
            projectIdAndData.id,
            d.ResourceState.Loaded({ data: projectIdAndData.data, getTime })
          );
        }
        return dict;
      });
    },
  };
};

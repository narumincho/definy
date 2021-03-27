import * as React from "react";
import * as d from "../../data";
import { OptionsObject, SnackbarKey, SnackbarMessage } from "notistack";
import { api } from "../api";
import { timeFromDate } from "../../core/util";

export type UseProjectDictResult = {
  /** キャッシュからプロジェクト内容を取得する `no effect` */
  getProjectByProjectId: (projectId: d.ProjectId) => d.Project | undefined;
  /** キャッシュからプロジェクトの取得状況と内容を取得する `no effect` */
  getProjectStateByProjectId: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  /** プロジェクトの内容を設定する */
  setProject: (projectId: d.ProjectId, project: d.WithTime<d.Project>) => void;
  /** 1度に複数のプロジェクトを設定する */
  setProjectList: (
    projectList: ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>,
    getTime: d.Time
  ) => void;
  /** サーバーからプロジェクトを取得する */
  requestProjectById: (projectId: d.ProjectId) => void;
};

export const useProjectDict = (
  enqueueSnackbar: (
    message: SnackbarMessage,
    options?: OptionsObject | undefined
  ) => SnackbarKey
): UseProjectDictResult => {
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

  const setProject = (
    projectId: d.ProjectId,
    projectWithTime: d.WithTime<d.Project>
  ): void => {
    setProjectState(projectId, d.ResourceState.Loaded(projectWithTime));
  };

  return {
    getProjectByProjectId: (projectId) => {
      const resource = projectDict.get(projectId);
      if (resource !== undefined && resource._ === "Loaded") {
        return resource.dataWithTime.data;
      }
      return undefined;
    },
    getProjectStateByProjectId: (projectId) => {
      return projectDict.get(projectId);
    },
    setProject,
    setProjectList: (projectList, getTime) => {
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
    requestProjectById: (projectId) => {
      setProjectState(projectId, d.ResourceState.Requesting());
      api.getProject(projectId).then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("プロジェクトの取得に失敗しました", {
            variant: "error",
          });
          setProjectState(
            projectId,
            d.ResourceState.Unknown(timeFromDate(new Date()))
          );
          return;
        }
        if (response.value.data._ === "Nothing") {
          enqueueSnackbar("プロジェクトが存在しなかった", {
            variant: "error",
          });
          setProjectState(
            projectId,
            d.ResourceState.Unknown(response.value.getTime)
          );
          return;
        }
        setProjectState(
          projectId,
          d.ResourceState.Loaded({
            data: response.value.data.value,
            getTime: response.value.getTime,
          })
        );
      });
    },
  };
};

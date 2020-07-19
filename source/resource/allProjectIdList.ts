import * as React from "react";
import * as api from "../api";
import * as coreUtil from "definy-core/source/util";
import {
  Maybe,
  Project,
  ProjectId,
  ResourceState,
} from "definy-core/source/data";

export const useProjectAllIdList = (): {
  allProjectIdListMaybe: Maybe<ResourceState<ReadonlyArray<ProjectId>>>;
  projectMap: ReadonlyMap<ProjectId, ResourceState<Project>>;
  requestProject: (projectId: ProjectId) => void;
  requestAllProject: () => void;
} => {
  const [allProjectIdListMaybe, dispatchAllProjectIdList] = React.useState<
    Maybe<ResourceState<ReadonlyArray<ProjectId>>>
  >(Maybe.Nothing());
  const [projectMap, setProjectMap] = React.useState<
    ReadonlyMap<ProjectId, ResourceState<Project>>
  >(new Map());

  const requestRef = React.useRef<number | undefined>();
  const loopCount = React.useRef<number>(0);

  // プロジェクトの一覧
  React.useEffect(() => {
    console.log("ResourceStateに応じて処理をする", allProjectIdListMaybe);
    if (allProjectIdListMaybe._ === "Nothing") {
      return;
    }
    const allProjectIdList = allProjectIdListMaybe.value;
    switch (allProjectIdList._) {
      case "Loaded":
      case "Unknown":
        return;
      case "WaitLoading":
        // dispatchAllProjectIdList(data.Maybe.Just(Resource.Loading()));
        /*
         * indexedDBにアクセスして取得
         * 代わりに失敗したということでWaitRequestingにする
         */
        dispatchAllProjectIdList(Maybe.Just(ResourceState.WaitRequesting()));
        return;
      case "Loading":
        return;
      case "WaitRequesting":
        dispatchAllProjectIdList(Maybe.Just(ResourceState.Requesting()));
        api.getAllProject().then((idAndProjectResourceList) => {
          setProjectMap(
            new Map(
              idAndProjectResourceList.map((project) => [
                project.id,
                ResourceState.Loaded(project.data),
              ])
            )
          );

          dispatchAllProjectIdList(
            Maybe.Just(
              ResourceState.Loaded({
                dataMaybe: Maybe.Just(
                  idAndProjectResourceList.map((project) => project.id)
                ),
                getTime: coreUtil.timeFromDate(new Date()),
              })
            )
          );
        });
        return;

      case "Requesting":
        return;
      case "WaitUpdating":
        dispatchAllProjectIdList(
          Maybe.Just(ResourceState.Updating(allProjectIdList.dataResource))
        );
        api.getAllProject().then((idAndProjectResourceList) => {
          setProjectMap(
            new Map(
              idAndProjectResourceList.map((project) => [
                project.id,
                ResourceState.Loaded(project.data),
              ])
            )
          );
          dispatchAllProjectIdList(
            Maybe.Just(
              ResourceState.Loaded({
                dataMaybe: Maybe.Just(
                  idAndProjectResourceList.map((project) => project.id)
                ),
                getTime: coreUtil.timeFromDate(new Date()),
              })
            )
          );
        });
        return;
      case "Updating":
        return;
      case "WaitRetrying":
        console.log("サーバーに問い合わせてプロジェクトの一覧を再取得する予定");
    }
  }, [allProjectIdListMaybe]);

  React.useEffect(() => {
    const newProjectData = new Map(projectMap);
    let isChanged = false;
    for (const [projectId, projectResource] of projectMap) {
      switch (projectResource._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newProjectData.set(projectId, ResourceState.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newProjectData.set(projectId, ResourceState.Requesting());
          api.getProject(projectId).then((project) => {
            setProjectMap((dict) => {
              const newDict = new Map(dict);
              newDict.set(projectId, ResourceState.Loaded(project));
              return newDict;
            });
          });
          break;
        case "Requesting":
          break;
        case "WaitRetrying":
          isChanged = true;
          console.log("再度プロジェクトのリクエストをする予定");
          break;
        case "Retrying":
        case "WaitUpdating":
        case "Updating":
        case "Unknown":
          break;
      }
    }
    if (isChanged) {
      setProjectMap(newProjectData);
    }
  }, [projectMap]);

  const updateCheck = () => {
    requestRef.current = window.requestAnimationFrame(updateCheck);
    loopCount.current += 1;
    if (loopCount.current < 60) {
      return;
    }
    loopCount.current = 0;

    dispatchAllProjectIdList(
      (
        beforeAllProjectIdListMaybe: Maybe<
          ResourceState<ReadonlyArray<ProjectId>>
        >
      ): Maybe<ResourceState<ReadonlyArray<ProjectId>>> => {
        if (beforeAllProjectIdListMaybe._ === "Nothing") {
          return beforeAllProjectIdListMaybe;
        }
        const allProjectIdList = beforeAllProjectIdListMaybe.value;
        switch (allProjectIdList._) {
          case "Loaded":
            if (
              coreUtil
                .timeToDate(allProjectIdList.dataResource.getTime)
                .getTime() +
                1000 * 10 <
              new Date().getTime()
            ) {
              console.log("更新するぞ");
              return Maybe.Just(
                ResourceState.WaitUpdating(allProjectIdList.dataResource)
              );
            }
        }
        return beforeAllProjectIdListMaybe;
      }
    );
  };

  React.useEffect(() => {
    requestRef.current = window.requestAnimationFrame(updateCheck);
    return () => {
      if (typeof requestRef.current === "number") {
        window.cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return {
    allProjectIdListMaybe,
    projectMap,
    requestAllProject: () => {
      dispatchAllProjectIdList((beforeAllProjectIdListMaybe) => {
        if (beforeAllProjectIdListMaybe._ === "Nothing") {
          return Maybe.Just(ResourceState.WaitLoading());
        }
        return beforeAllProjectIdListMaybe;
      });
    },
    requestProject: (projectId: ProjectId) => {
      setProjectMap((beforeMap) => {
        if (!beforeMap.has(projectId)) {
          const newDict = new Map(beforeMap);
          newDict.set(projectId, ResourceState.WaitLoading());
          return newDict;
        }
        return beforeMap;
      });
    },
  };
};

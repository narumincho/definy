import * as React from "react";
import * as api from "../api";
import * as coreUtil from "definy-core/source/util";
import { Maybe, ProjectId, ResourceState } from "definy-core/source/data";

let count = 0;
const update = (
  allProjectIdListMaybe: Maybe<ResourceState<ReadonlyArray<ProjectId>>>
): Maybe<ResourceState<ReadonlyArray<ProjectId>>> => {
  count += 1;
  if (count < 60) {
    return allProjectIdListMaybe;
  }
  count = 0;
  if (allProjectIdListMaybe._ === "Nothing") {
    return allProjectIdListMaybe;
  }
  const allProjectIdList = allProjectIdListMaybe.value;
  switch (allProjectIdList._) {
    case "Loaded":
      if (
        coreUtil.timeToDate(allProjectIdList.dataResource.getTime).getTime() +
          1000 * 10 <
        new Date().getTime()
      ) {
        console.log("更新するぞ");
        return Maybe.Just(
          ResourceState.WaitUpdating(allProjectIdList.dataResource)
        );
      }
  }
  return allProjectIdListMaybe;
};

export const useProjectAllIdList = (): {
  allProjectIdListMaybe: Maybe<ResourceState<ReadonlyArray<ProjectId>>>;
  requestLoadAllProjectIdList: () => void;
} => {
  const [allProjectIdListMaybe, dispatchAllProjectIdList] = React.useState<
    Maybe<ResourceState<ReadonlyArray<ProjectId>>>
  >(Maybe.Nothing());

  const requestRef = React.useRef<number | undefined>();

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
          /*
           *   setProjectData(
           *     new Map(
           *       idAndProjectResourceList.map((project) => [
           *         project.id,
           *         ResourceState.Loaded(project.data),
           *       ])
           *     )
           *   );
           */
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
          /*
           *   setProjectData(
           *     new Map(
           *       idAndProjectResourceList.map((project) => [
           *         project.id,
           *         ResourceState.Loaded(project.data),
           *       ])
           *     )
           *   );
           */
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

  const updateCheck = () => {
    requestRef.current = window.requestAnimationFrame(updateCheck);
    dispatchAllProjectIdList(update);
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
    requestLoadAllProjectIdList: () => {
      dispatchAllProjectIdList(Maybe.Just(ResourceState.WaitLoading()));
    },
  };
};

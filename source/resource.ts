import * as React from "react";
import * as api from "./api";
import * as coreUtil from "definy-core/source/util";
import {
  ImageToken,
  Maybe,
  Project,
  ProjectId,
  Resource,
  ResourceState,
  StaticResourceState,
  User,
  UserId,
} from "definy-core/source/data";

export const useProjectAllIdList = (): {
  allProjectIdListMaybe: Maybe<ResourceState<ReadonlyArray<ProjectId>>>;
  projectMap: ReadonlyMap<ProjectId, ResourceState<Project>>;
  userMap: ReadonlyMap<UserId, ResourceState<User>>;
  imageMap: ReadonlyMap<ImageToken, StaticResourceState<string>>;
  requestAllProject: () => void;
  requestProject: (projectId: ProjectId) => void;
  requestUser: (userId: UserId) => void;
  setUser: (userId: UserId, userResource: Resource<User>) => void;
  requestImage: (imageToken: ImageToken) => void;
} => {
  const [allProjectIdListMaybe, dispatchAllProjectIdList] = React.useState<
    Maybe<ResourceState<ReadonlyArray<ProjectId>>>
  >(Maybe.Nothing());
  const [projectMap, setProjectMap] = React.useState<
    ReadonlyMap<ProjectId, ResourceState<Project>>
  >(new Map());
  const [userMap, setUserMap] = React.useState<
    ReadonlyMap<UserId, ResourceState<User>>
  >(new Map());
  const [imageMap, setImageMap] = React.useState<
    ReadonlyMap<ImageToken, StaticResourceState<string>>
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

  React.useEffect(() => {
    const newUserData = new Map(userMap);
    let isChanged = false;
    for (const [userId, userResourceState] of userMap) {
      switch (userResourceState._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newUserData.set(userId, ResourceState.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newUserData.set(userId, ResourceState.Requesting());
          api.getUser(userId).then((userResource) => {
            setUserMap((dict) => {
              const newDict = new Map(dict);
              newDict.set(userId, ResourceState.Loaded(userResource));
              return newDict;
            });
          });
          break;
        case "Requesting":
          break;
        case "WaitRetrying":
          isChanged = true;
          console.log("再度ユーザーのリクエストをする予定");
          break;
        case "Retrying":
        case "WaitUpdating":
        case "Updating":
        case "Unknown":
          break;
      }
    }
    if (isChanged) {
      setUserMap(newUserData);
    }
  }, [userMap]);

  React.useEffect(() => {
    const newImageData = new Map(imageMap);
    let isChanged = false;
    for (const [imageToken, imageDataItem] of imageMap) {
      switch (imageDataItem._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newImageData.set(imageToken, StaticResourceState.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newImageData.set(imageToken, StaticResourceState.Requesting());
          api.getImageFile(imageToken).then((binaryMaybe) => {
            if (binaryMaybe._ === "Nothing") {
              throw new Error("存在しない画像をリクエストしてしまった");
            }
            setImageMap((dict) => {
              const newDict = new Map(dict);
              newDict.set(
                imageToken,
                StaticResourceState.Loaded(
                  window.URL.createObjectURL(
                    new Blob([binaryMaybe.value], {
                      type: "image/png",
                    })
                  )
                )
              );
              return newDict;
            });
          });
          break;
        case "Requesting":
          break;
        case "WaitRetrying":
          isChanged = true;
          console.log("再度画像のリクエストをする予定");
          break;
        case "Retrying":
          break;
        case "Unknown":
          break;
      }
    }
    if (isChanged) {
      setImageMap(newImageData);
    }
  }, [imageMap]);

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
    userMap,
    imageMap,
    requestAllProject: () => {
      dispatchAllProjectIdList((beforeAllProjectIdListMaybe) => {
        if (beforeAllProjectIdListMaybe._ === "Nothing") {
          return Maybe.Just(ResourceState.WaitLoading());
        }
        return beforeAllProjectIdListMaybe;
      });
    },
    requestProject: (projectId: ProjectId) => {
      setProjectMap((beforeProjectMap) => {
        if (!beforeProjectMap.has(projectId)) {
          const newProjectMap = new Map(beforeProjectMap);
          newProjectMap.set(projectId, ResourceState.WaitLoading());
          return newProjectMap;
        }
        return beforeProjectMap;
      });
    },
    requestUser: (userId: UserId) => {
      setUserMap((beforeUserMap) => {
        if (!beforeUserMap.has(userId)) {
          const newUserMap = new Map(beforeUserMap);
          newUserMap.set(userId, ResourceState.WaitLoading());
          return newUserMap;
        }
        return beforeUserMap;
      });
    },
    setUser: (userId: UserId, userResource: Resource<User>) => {
      setUserMap((beforeUserMap) => {
        const newUserMap = new Map(beforeUserMap);
        newUserMap.set(userId, ResourceState.Loaded(userResource));
        return newUserMap;
      });
    },
    requestImage: (imageToken: ImageToken) => {
      setImageMap((beforeImageMap) => {
        if (!imageMap.has(imageToken)) {
          const newDict = new Map(beforeImageMap);
          newDict.set(imageToken, StaticResourceState.WaitLoading());
          return newDict;
        }
        return beforeImageMap;
      });
    },
  };
};

import * as React from "react";
import * as api from "./api";
import * as core from "definy-core";
import * as coreUtil from "definy-core/source/util";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";

export type CreateProjectState =
  | {
      _: "None";
    }
  | { _: "WaitCreating"; projectName: string }
  | { _: "Creating"; projectName: string }
  | { _: "Created"; projectId: d.ProjectId };

export type CreateIdeaState =
  | { _: "None" }
  | { _: "WaitCreating"; ideaName: string; parentId: d.IdeaId }
  | { _: "Creating"; ideaName: string; parentId: d.ProjectId }
  | { _: "Created"; ideaId: d.IdeaId };

export type Model = {
  readonly logInState: d.LogInState;
  readonly language: d.Language;
  readonly clientMode: d.ClientMode;
  readonly location: d.Location;
  readonly projectMap: ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>;
  readonly userMap: ReadonlyMap<d.UserId, d.ResourceState<d.User>>;
  readonly imageMap: ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>;
  readonly ideaMap: ReadonlyMap<d.IdeaId, d.ResourceState<d.Idea>>;
  readonly projectIdeaIdMap: ReadonlyMap<d.ProjectId, ReadonlyArray<d.IdeaId>>;
  readonly createProjectState: CreateProjectState;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly requestLogOut: () => void;
  readonly allProjectIdListMaybe: d.Maybe<
    d.ResourceState<ReadonlyArray<d.ProjectId>>
  >;
  readonly requestAllProject: () => void;
  readonly requestProject: (projectId: d.ProjectId) => void;
  readonly requestUser: (userId: d.UserId) => void;
  readonly requestImage: (imageToken: d.ImageToken) => void;
  readonly requestIdea: (ideaId: d.IdeaId) => void;
  readonly createProject: (projectName: string) => void;
  readonly createIdea: (ideaName: string, parentId: d.IdeaId) => void;
  readonly requestProjectIdea: (projectId: d.ProjectId) => void;
  readonly requestLogIn: (provider: d.OpenIdConnectProvider) => void;
};

export type Init = {
  initUrlData: d.UrlData;
  accessToken: d.Maybe<d.AccessToken>;
};

/**
 * Definy のクライアントの見た目以外の処理をする.
 */
export const useModel = (prop: Init): Model => {
  const [allProjectIdListMaybe, setAllProjectIdList] = React.useState<
    d.Maybe<d.ResourceState<ReadonlyArray<d.ProjectId>>>
  >(d.Maybe.Nothing());
  const [projectMap, setProjectMap] = React.useState<
    ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>
  >(new Map());
  const [userMap, setUserMap] = React.useState<
    ReadonlyMap<d.UserId, d.ResourceState<d.User>>
  >(new Map());
  const [imageMap, setImageMap] = React.useState<
    ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>
  >(new Map());

  const [ideaMap, setIdeaMap] = React.useState<
    ReadonlyMap<d.IdeaId, d.ResourceState<d.Idea>>
  >(new Map());

  const [urlData, onJump] = React.useState<d.UrlData>(prop.initUrlData);
  const [logInState, setLogInState] = React.useState<d.LogInState>(
    prop.accessToken._ === "Just"
      ? d.LogInState.WaitVerifyingAccessToken(prop.accessToken.value)
      : d.LogInState.WaitLoadingAccessTokenFromIndexedDB
  );
  const [createProjectState, setCreateProjectState] = React.useState<
    CreateProjectState
  >({ _: "None" });

  const [createIdeaState, setCreateIdeaState] = React.useState<CreateIdeaState>(
    { _: "None" }
  );

  const [isLogOutRequest, setIsLogOutRequest] = React.useState<boolean>(false);
  const [projectIdeaIdMap, setProjectIdeaIdMap] = React.useState<
    ReadonlyMap<d.ProjectId, ReadonlyArray<d.IdeaId>>
  >(new Map());

  const requestRef = React.useRef<number | undefined>();
  const loopCount = React.useRef<number>(0);

  const setUser = (
    userId: d.UserId,
    userResource: d.Resource<d.User>
  ): void => {
    setUserMap((beforeUserMap) => {
      const newUserMap = new Map(beforeUserMap);
      newUserMap.set(userId, d.ResourceState.Loaded(userResource));
      return newUserMap;
    });
  };
  const setIdeaResourceList = (
    ideaResourceList: ReadonlyArray<d.IdAndData<d.IdeaId, d.Resource<d.Idea>>>
  ): void => {
    setIdeaMap((beforeIdeaMap) => {
      const newIdeaMap = new Map(beforeIdeaMap);
      for (const { id, data } of ideaResourceList) {
        newIdeaMap.set(id, d.ResourceState.Loaded(data));
      }
      return newIdeaMap;
    });
  };

  // ルーティング
  React.useEffect(() => {
    window.history.pushState(
      undefined,
      "",
      core.urlDataAndAccessTokenToUrl(urlData, d.Maybe.Nothing()).toString()
    );
    window.addEventListener("popstate", () => {
      onJump(
        core.urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
  }, [urlData]);

  React.useEffect(logInEffect(logInState, urlData, setLogInState, setUser), [
    logInState,
  ]);

  React.useEffect(
    createProjectEffect(createProjectState, logInState, setCreateProjectState),
    [createProjectState]
  );

  React.useEffect(
    createIdeaEffect(createIdeaState, logInState, setCreateIdeaState),
    [createIdeaState]
  );

  React.useEffect(() => {
    if (isLogOutRequest) {
      setIsLogOutRequest(false);
      indexedDB.deleteAccessToken().then(() => {
        setLogInState(d.LogInState.Guest);
      });
    }
  }, [isLogOutRequest]);

  React.useEffect(
    allProjectIdEffect(
      allProjectIdListMaybe,
      setAllProjectIdList,
      setProjectMap
    ),
    [allProjectIdListMaybe]
  );

  React.useEffect(projectMapEffect(projectMap, setProjectMap), [projectMap]);

  React.useEffect(userMapEffect(userMap, setUserMap), [userMap]);

  React.useEffect(imageMapEffect(imageMap, setImageMap), [imageMap]);

  React.useEffect(ideaMapEffect(ideaMap, setIdeaMap), [ideaMap]);

  // 更新
  const updateCheck = () => {
    requestRef.current = window.requestAnimationFrame(updateCheck);
    loopCount.current += 1;
    if (loopCount.current < 60) {
      return;
    }
    loopCount.current = 0;

    setAllProjectIdList(
      (
        beforeAllProjectIdListMaybe: d.Maybe<
          d.ResourceState<ReadonlyArray<d.ProjectId>>
        >
      ): d.Maybe<d.ResourceState<ReadonlyArray<d.ProjectId>>> => {
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
              return d.Maybe.Just(
                d.ResourceState.WaitUpdating(allProjectIdList.dataResource)
              );
            }
        }
        return beforeAllProjectIdListMaybe;
      }
    );
  };

  // 更新機能を有効にしたいときはコメントを外す
  /*
   * React.useEffect(() => {
   *   requestRef.current = window.requestAnimationFrame(updateCheck);
   *   return () => {
   *     if (typeof requestRef.current === "number") {
   *       window.cancelAnimationFrame(requestRef.current);
   *     }
   *   };
   * }, []);
   */

  return {
    clientMode: urlData.clientMode,
    language: urlData.language,
    location: urlData.location,
    logInState,
    allProjectIdListMaybe,
    projectMap,
    userMap,
    imageMap,
    ideaMap,
    createProjectState,
    projectIdeaIdMap,
    onJump,
    requestAllProject: () => {
      setAllProjectIdList((beforeAllProjectIdListMaybe) => {
        if (beforeAllProjectIdListMaybe._ === "Nothing") {
          return d.Maybe.Just(d.ResourceState.WaitLoading());
        }
        return beforeAllProjectIdListMaybe;
      });
    },
    requestProject: (projectId: d.ProjectId) => {
      setProjectMap((beforeProjectMap) => {
        if (!beforeProjectMap.has(projectId)) {
          const newProjectMap = new Map(beforeProjectMap);
          newProjectMap.set(projectId, d.ResourceState.WaitLoading());
          return newProjectMap;
        }
        return beforeProjectMap;
      });
    },
    requestUser: (userId: d.UserId) => {
      setUserMap((beforeUserMap) => {
        if (!beforeUserMap.has(userId)) {
          const newUserMap = new Map(beforeUserMap);
          newUserMap.set(userId, d.ResourceState.WaitLoading());
          return newUserMap;
        }
        return beforeUserMap;
      });
    },
    requestImage: (imageToken: d.ImageToken) => {
      setImageMap((beforeImageMap) => {
        if (!imageMap.has(imageToken)) {
          const newDict = new Map(beforeImageMap);
          newDict.set(imageToken, d.StaticResourceState.WaitLoading());
          return newDict;
        }
        return beforeImageMap;
      });
    },
    requestIdea: (ideaId: d.IdeaId) => {
      if (!ideaMap.has(ideaId)) {
        const newIdeaMap = new Map(ideaMap);
        newIdeaMap.set(ideaId, d.ResourceState.WaitLoading());
        return newIdeaMap;
      }
    },
    createProject: (projectName) => {
      setCreateProjectState({ _: "WaitCreating", projectName });
    },
    requestLogOut: () => {
      setIsLogOutRequest(true);
    },
    createIdea: (ideaName: string, parentId: d.IdeaId) => {
      setCreateIdeaState({ _: "WaitCreating", ideaName, parentId });
    },
    requestProjectIdea: (projectId: d.ProjectId) => {
      api.getIdeaAndIdListByProjectId(projectId).then((ideaResourceList) => {
        setIdeaResourceList(ideaResourceList);
        setProjectIdeaIdMap((beforeProjectIdMap) => {
          const newProjectIdMap = new Map(beforeProjectIdMap);
          newProjectIdMap.set(
            projectId,
            ideaResourceList.map((idAndData) => idAndData.id)
          );
          return newProjectIdMap;
        });
      });
    },
    requestLogIn: (provider) => {
      setLogInState(d.LogInState.WaitRequestingLogInUrl(provider));
    },
  };
};

const logInEffect = (
  logInState: d.LogInState,
  urlData: d.UrlData,
  dispatchLogInState: React.Dispatch<React.SetStateAction<d.LogInState>>,
  setUser: (userId: d.UserId, userResource: d.Resource<d.User>) => void
): React.EffectCallback => () => {
  switch (logInState._) {
    case "WaitLoadingAccessTokenFromIndexedDB":
      dispatchLogInState(d.LogInState.LoadingAccessTokenFromIndexedDB);
      indexedDB.getAccessToken().then((accessToken) => {
        if (accessToken === undefined) {
          dispatchLogInState(d.LogInState.Guest);
        } else {
          dispatchLogInState(
            d.LogInState.WaitVerifyingAccessToken(accessToken)
          );
        }
      });
      return;
    case "Guest":
      return;
    case "WaitRequestingLogInUrl":
      dispatchLogInState(
        d.LogInState.RequestingLogInUrl(logInState.openIdConnectProvider)
      );
      api
        .requestLogInUrl({
          openIdConnectProvider: logInState.openIdConnectProvider,
          urlData,
        })
        .then((logInUrl) => {
          dispatchLogInState(d.LogInState.JumpingToLogInPage(logInUrl));
        });
      return;
    case "JumpingToLogInPage":
      window.location.href = logInState.string;
      return;
    case "WaitVerifyingAccessToken":
      dispatchLogInState({
        _: "VerifyingAccessToken",
        accessToken: logInState.accessToken,
      });
      api
        .getUserByAccessToken(logInState.accessToken)
        .then((userResourceAndIdMaybe) => {
          switch (userResourceAndIdMaybe._) {
            case "Just":
              indexedDB.setAccessToken(logInState.accessToken);
              dispatchLogInState(
                d.LogInState.LoggedIn({
                  accessToken: logInState.accessToken,
                  userId: userResourceAndIdMaybe.value.id,
                })
              );
              setUser(
                userResourceAndIdMaybe.value.id,
                userResourceAndIdMaybe.value.data
              );
              return;
            case "Nothing":
              dispatchLogInState(d.LogInState.Guest);
          }
        });
  }
};

const createProjectEffect = (
  createProjectState: CreateProjectState,
  logInState: d.LogInState,
  setCreateProjectState: React.Dispatch<
    React.SetStateAction<CreateProjectState>
  >
): React.EffectCallback => () => {
  switch (createProjectState._) {
    case "None":
      return;
    case "WaitCreating":
      if (logInState._ === "LoggedIn") {
        api
          .createProject({
            accessToken: logInState.accessTokenAndUserId.accessToken,
            projectName: createProjectState.projectName,
          })
          .then((projectMaybe) => {
            if (projectMaybe._ === "Just") {
              setCreateProjectState({
                _: "Created",
                projectId: projectMaybe.value.id,
              });
            } else {
              console.log("プロジェクト作成に失敗");
            }
          });
      }
  }
};

const createIdeaEffect = (
  createIdeaState: CreateIdeaState,
  logInState: d.LogInState,
  setCreateIdeaState: React.Dispatch<React.SetStateAction<CreateIdeaState>>
): React.EffectCallback => () => {
  switch (createIdeaState._) {
    case "None":
      return;
    case "WaitCreating":
      if (logInState._ === "LoggedIn") {
        api
          .createIdea({
            accessToken: logInState.accessTokenAndUserId.accessToken,
            ideaName: createIdeaState.ideaName,
            parentId: createIdeaState.parentId,
          })
          .then((ideaMaybe) => {
            if (ideaMaybe._ === "Just") {
              setCreateIdeaState({
                _: "Created",
                ideaId: ideaMaybe.value.id,
              });
            } else {
              console.log("アイデアの作成に失敗");
            }
          });
      }
  }
};

const allProjectIdEffect = (
  allProjectIdListMaybe: d.Maybe<d.ResourceState<ReadonlyArray<d.ProjectId>>>,
  setAllProjectIdList: React.Dispatch<
    React.SetStateAction<d.Maybe<d.ResourceState<ReadonlyArray<d.ProjectId>>>>
  >,
  setProjectMap: React.Dispatch<
    React.SetStateAction<ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>>
  >
): React.EffectCallback => () => {
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
      setAllProjectIdList(d.Maybe.Just(d.ResourceState.WaitRequesting()));
      return;
    case "Loading":
      return;
    case "WaitRequesting":
      setAllProjectIdList(d.Maybe.Just(d.ResourceState.Requesting()));
      api.getAllProject().then((idAndProjectResourceList) => {
        setProjectMap(
          new Map(
            idAndProjectResourceList.map((project) => [
              project.id,
              d.ResourceState.Loaded(project.data),
            ])
          )
        );

        setAllProjectIdList(
          d.Maybe.Just(
            d.ResourceState.Loaded({
              dataMaybe: d.Maybe.Just(
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
      setAllProjectIdList(
        d.Maybe.Just(d.ResourceState.Updating(allProjectIdList.dataResource))
      );
      api.getAllProject().then((idAndProjectResourceList) => {
        setProjectMap(
          new Map(
            idAndProjectResourceList.map((project) => [
              project.id,
              d.ResourceState.Loaded(project.data),
            ])
          )
        );
        setAllProjectIdList(
          d.Maybe.Just(
            d.ResourceState.Loaded({
              dataMaybe: d.Maybe.Just(
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
};

/**
 * プロジェクトのデータ
 */
const projectMapEffect = (
  projectMap: ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>,
  setProjectMap: React.Dispatch<
    React.SetStateAction<ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>>
  >
): React.EffectCallback => () => {
  const newProjectData = new Map(projectMap);
  let isChanged = false;
  for (const [projectId, projectResource] of projectMap) {
    switch (projectResource._) {
      case "Loaded":
        break;
      case "WaitLoading":
        isChanged = true;
        newProjectData.set(projectId, d.ResourceState.WaitRequesting());
        break;
      case "Loading":
        break;
      case "WaitRequesting":
        isChanged = true;
        newProjectData.set(projectId, d.ResourceState.Requesting());
        api.getProject(projectId).then((project) => {
          setProjectMap((dict) => {
            const newDict = new Map(dict);
            newDict.set(projectId, d.ResourceState.Loaded(project));
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
};

const userMapEffect = (
  userMap: ReadonlyMap<d.UserId, d.ResourceState<d.User>>,
  setUserMap: React.Dispatch<
    React.SetStateAction<ReadonlyMap<d.UserId, d.ResourceState<d.User>>>
  >
): React.EffectCallback => () => {
  const newUserData = new Map(userMap);
  let isChanged = false;
  for (const [userId, userResourceState] of userMap) {
    switch (userResourceState._) {
      case "Loaded":
        break;
      case "WaitLoading":
        isChanged = true;
        newUserData.set(userId, d.ResourceState.WaitRequesting());
        break;
      case "Loading":
        break;
      case "WaitRequesting":
        isChanged = true;
        newUserData.set(userId, d.ResourceState.Requesting());
        api.getUser(userId).then((userResource) => {
          setUserMap((dict) => {
            const newDict = new Map(dict);
            newDict.set(userId, d.ResourceState.Loaded(userResource));
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
};

const imageMapEffect = (
  imageMap: ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>,
  setImageMap: React.Dispatch<
    React.SetStateAction<
      ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>
    >
  >
): React.EffectCallback => () => {
  const newImageData = new Map(imageMap);
  let isChanged = false;
  for (const [imageToken, imageDataItem] of imageMap) {
    switch (imageDataItem._) {
      case "Loaded":
        break;
      case "WaitLoading":
        isChanged = true;
        newImageData.set(imageToken, d.StaticResourceState.WaitRequesting());
        break;
      case "Loading":
        break;
      case "WaitRequesting":
        isChanged = true;
        newImageData.set(imageToken, d.StaticResourceState.Requesting());
        api.getImageFile(imageToken).then((binaryMaybe) => {
          if (binaryMaybe._ === "Nothing") {
            throw new Error("存在しない画像をリクエストしてしまった");
          }
          setImageMap((dict) => {
            const newDict = new Map(dict);
            newDict.set(
              imageToken,
              d.StaticResourceState.Loaded(
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
};

const ideaMapEffect = (
  ideaMap: ReadonlyMap<d.IdeaId, d.ResourceState<d.Idea>>,
  setIdeaMap: React.Dispatch<
    React.SetStateAction<ReadonlyMap<d.IdeaId, d.ResourceState<d.Idea>>>
  >
): React.EffectCallback => () => {
  const newIdeaData = new Map(ideaMap);
  let isChanged = false;
  for (const [ideaId, userResourceState] of ideaMap) {
    switch (userResourceState._) {
      case "Loaded":
        break;
      case "WaitLoading":
        isChanged = true;
        newIdeaData.set(ideaId, d.ResourceState.WaitRequesting());
        break;
      case "Loading":
        break;
      case "WaitRequesting":
        isChanged = true;
        newIdeaData.set(ideaId, d.ResourceState.Requesting());
        api.getIdea(ideaId).then((userResource) => {
          setIdeaMap((dict) => {
            const newDict = new Map(dict);
            newDict.set(ideaId, d.ResourceState.Loaded(userResource));
            return newDict;
          });
        });
        break;
      case "Requesting":
        break;
      case "WaitRetrying":
        isChanged = true;
        console.log("再度アイデアのリクエストをする予定");
        break;
      case "Retrying":
      case "WaitUpdating":
      case "Updating":
      case "Unknown":
        break;
    }
  }
  if (isChanged) {
    setIdeaMap(newIdeaData);
  }
};

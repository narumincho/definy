import * as a from "./appInterface";
import * as core from "definy-core";
import * as coreUtil from "definy-core/source/util";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";
import * as pageAbout from "./pageAbout";
import * as pageCreateProject from "./pageCreateProject";
import * as pageDebug from "./pageDebug";
import * as pageHome from "./pageHome";
import * as pageProject from "./pageProject";
import * as pageSetting from "./pageSetting";
import * as pageUser from "./pageUser";
import { CSSObject, keyframes } from "@emotion/css";
import { Element, View } from "./view/view";
import { api, getImageWithCache } from "./api";
import { c, div, elementMap, view } from "./view/viewUtil";
import { mapMapAt, mapSet } from "./util";
import { headerView } from "./header";

export interface State {
  readonly appInterface: a.AppInterface;
  readonly pageModel: PageModel;
}

export type Message =
  | {
      readonly tag: typeof appInterfaceMessage;
      readonly message: a.Message;
    }
  | {
      readonly tag: typeof projectPageMessage;
      readonly message: pageProject.PageMessage;
    };

const appInterfaceMessage = Symbol("AppInterfaceMessage");
const projectPageMessage = Symbol("ProjectPageMessage");

const appMessageToMessage = (appMessage: a.Message): Message => ({
  tag: appInterfaceMessage,
  message: appMessage,
});

export type PageModel =
  | { readonly tag: typeof pageModelHome }
  | { readonly tag: typeof pageModelCreateProject }
  | {
      readonly tag: typeof pageModelAboutTag;
    }
  | {
      readonly tag: typeof pageModelUserTag;
      readonly userId: d.UserId;
    }
  | {
      readonly tag: typeof pageModelDebug;
      readonly tab: pageDebug.Tab;
    }
  | {
      readonly tag: typeof pageModelSetting;
    }
  | {
      readonly tag: typeof pageModelProject;
      readonly projectId: d.ProjectId;
      readonly state: pageProject.State;
    };

export const pageModelHome = Symbol("PageModel-Home");
export const pageModelCreateProject = Symbol("PageModel-CrateProject");
export const pageModelAboutTag = Symbol("PageModel-About");
export const pageModelUserTag = Symbol("PageModel-User");
export const pageModelDebug = Symbol("PageModel-Debug");
export const pageModelSetting = Symbol("PageModel-Setting");
export const pageModelProject = Symbol("PageModel-Project");

export const initState = (
  messageHandler: (message: Message) => void
): State => {
  const appMessageHandler = (appMessage: a.Message): void => {
    messageHandler(appMessageToMessage(appMessage));
  };

  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    appMessageHandler({
      tag: a.messageChangeLocationAndLanguage,
      language: newUrlData.language,
      location: newUrlData.location,
    });
  });

  const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
    new URL(window.location.href)
  );
  // ブラウザのURLを正規化 アクセストークンを隠す
  window.history.replaceState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        urlDataAndAccountToken.urlData,
        d.Maybe.Nothing()
      )
      .toString()
  );
  const appInterface: a.AppInterface = {
    top50ProjectIdState: { _: "None" },
    projectMap: new Map(),
    userMap: new Map(),
    imageMap: new Map(),
    typePartMap: new Map(),
    isCreatingProject: false,
    typePartEditState: "None",
    getTypePartInProjectState: { _: "None" },
    language: urlDataAndAccountToken.urlData.language,
    clientMode: urlDataAndAccountToken.urlData.clientMode,
    logInState:
      urlDataAndAccountToken.accountToken._ === "Just"
        ? d.LogInState.VerifyingAccountToken(
            urlDataAndAccountToken.accountToken.value
          )
        : d.LogInState.LoadingAccountTokenFromIndexedDB,
    outputCode: undefined,
  };

  switch (appInterface.logInState._) {
    case "LoadingAccountTokenFromIndexedDB": {
      indexedDB.getAccountToken().then((accountToken) => {
        appMessageHandler({
          tag: a.messageRespondAccountTokenFromIndexedDB,
          accountToken,
        });
      });
      break;
    }
    case "VerifyingAccountToken": {
      verifyAccountToken(
        appMessageHandler,
        appInterface.logInState.accountToken
      );
    }
  }

  return {
    appInterface,
    pageModel: locationToInitPageModel(
      appMessageHandler,
      urlDataAndAccountToken.urlData.location
    ),
  };
};

export const updateStateByMessage = (
  messageHandler: (message: Message) => void,
  message: Message,
  oldState: State
): State => {
  const appInterfaceMessageHandler = (appMessage: a.Message): void =>
    messageHandler(appMessageToMessage(appMessage));
  switch (message.tag) {
    case appInterfaceMessage:
      return updateStateByAppMessage(
        appInterfaceMessageHandler,
        message.message,
        oldState
      );
    case projectPageMessage:
      if (oldState.pageModel.tag === pageModelProject) {
        return {
          appInterface: oldState.appInterface,
          pageModel: {
            tag: pageModelProject,
            projectId: oldState.pageModel.projectId,
            state: pageProject.updateSateByLocalMessage(
              oldState.pageModel.state,
              message.message,
              appInterfaceMessageHandler
            ),
          },
        };
      }
      return oldState;
  }
};

// eslint-disable-next-line complexity
const updateStateByAppMessage = (
  messageHandler: (message: a.Message) => void,
  message: a.Message,
  oldState: State
): State => {
  switch (message.tag) {
    case a.messageNoOp:
      return oldState;
    case a.messageJumpTag:
      return jump(messageHandler, message.location, message.language, oldState);

    case a.messageChangeLocationAndLanguage:
      return changeLocationAndLanguage(
        messageHandler,
        message.location,
        message.language,
        oldState
      );

    case a.messageRequestLogInTag:
      return logIn(messageHandler, message.provider, oldState);

    case a.messageRespondLogInUrlTag:
      return respondLogInUrl(message.logInUrlMaybe, oldState);

    case a.messageLogOut:
      return logOut(oldState);

    case a.messageGetUserTag:
      return getUser(message.userId, messageHandler, oldState);

    case a.messageRespondUserTag:
      return respondUser(
        messageHandler,
        message.userId,
        message.response,
        oldState
      );

    case a.messageRespondAccountTokenFromIndexedDB:
      if (message.accountToken === undefined) {
        return {
          appInterface: {
            ...oldState.appInterface,
            logInState: d.LogInState.Guest,
          },
          pageModel: oldState.pageModel,
        };
      }
      verifyAccountToken(messageHandler, message.accountToken);
      return {
        appInterface: {
          ...oldState.appInterface,
          logInState: d.LogInState.VerifyingAccountToken(message.accountToken),
        },
        pageModel: oldState.pageModel,
      };

    case a.messageRespondUserByAccountToken:
      return respondUserByAccountToken(
        message.response,
        messageHandler,
        oldState
      );

    case a.messageGetTop50Project:
      return requestTop50Project(messageHandler, oldState);

    case a.messageRespondAllTop50Project:
      return respondTop50Project(message.response, messageHandler, oldState);

    case a.messageGetProject:
      return requestProject(message.projectId, messageHandler, oldState);

    case a.messageRespondProject:
      return respondProject(
        message.projectId,
        message.response,
        messageHandler,
        oldState
      );

    case a.messageGetImage:
      return getImage(message.imageToken, messageHandler, oldState);

    case a.messageRespondImage:
      return respondImage(message.imageToken, message.response, oldState);

    case a.messageGenerateCode:
      return generateCode(message.definyCode, oldState);

    case a.messageGetTypePartInProject:
      return requestTypePartInProject(
        message.projectId,
        messageHandler,
        oldState
      );

    case a.messageRespondTypePartInProject:
      return respondTypePartInProject(message.response, oldState);

    case a.messageCreateProject:
      return createProject(message.projectName, messageHandler, oldState);

    case a.messageRespondCreatingProject:
      return respondCreatingProject(message.response, oldState);

    case a.messageSetTypePartList:
      return setTypePartList(
        message.projectId,
        message.code,
        messageHandler,
        oldState
      );

    case a.messageRespondSetTypePartList:
      return respondSetTypePartList(message.response, oldState);

    case a.messageSelectDebugPageTab:
      if (oldState.pageModel.tag !== pageModelDebug) {
        return oldState;
      }
      return {
        appInterface: oldState.appInterface,
        pageModel: {
          ...oldState.pageModel,
          tab: message.tab,
        },
      };

    case a.messageSetTypePartName:
      return {
        appInterface: {
          ...oldState.appInterface,
          typePartMap: mapMapAt(
            oldState.appInterface.typePartMap,
            message.typePartId,
            (old: d.ResourceState<d.TypePart>): d.ResourceState<d.TypePart> => {
              if (old._ !== "Loaded") {
                return old;
              }
              return d.ResourceState.Loaded({
                data: { ...old.dataWithTime.data, name: message.newName },
                getTime: old.dataWithTime.getTime,
              });
            }
          ),
        },
        pageModel: oldState.pageModel,
      };
    case a.messageSetTypePartDescription:
      return {
        appInterface: {
          ...oldState.appInterface,
          typePartMap: mapMapAt(
            oldState.appInterface.typePartMap,
            message.typePartId,
            (old: d.ResourceState<d.TypePart>): d.ResourceState<d.TypePart> => {
              if (old._ !== "Loaded") {
                return old;
              }
              return d.ResourceState.Loaded({
                data: {
                  ...old.dataWithTime.data,
                  description: message.newDescription,
                },
                getTime: old.dataWithTime.getTime,
              });
            }
          ),
        },
        pageModel: oldState.pageModel,
      };

    case a.messageSetTypePartBodyTag:
      return {
        appInterface: {
          ...oldState.appInterface,
          typePartMap: mapMapAt(
            oldState.appInterface.typePartMap,
            message.typePartId,
            (old: d.ResourceState<d.TypePart>): d.ResourceState<d.TypePart> => {
              if (old._ !== "Loaded") {
                return old;
              }
              return d.ResourceState.Loaded({
                data: {
                  ...old.dataWithTime.data,
                  body: typePartBodyTagToInitTypePartBody(message.newBodyTag),
                },
                getTime: old.dataWithTime.getTime,
              });
            }
          ),
        },
        pageModel: oldState.pageModel,
      };
    case a.messageSetTypePartBodyKernel:
      return {
        appInterface: {
          ...oldState.appInterface,
          typePartMap: mapMapAt(
            oldState.appInterface.typePartMap,
            message.typePartId,
            (old: d.ResourceState<d.TypePart>): d.ResourceState<d.TypePart> => {
              if (old._ !== "Loaded") {
                return old;
              }
              return d.ResourceState.Loaded({
                data: {
                  ...old.dataWithTime.data,
                  body: d.TypePartBody.Kernel(message.typePartBodyKernel),
                },
                getTime: old.dataWithTime.getTime,
              });
            }
          ),
        },
        pageModel: oldState.pageModel,
      };
  }
};

const typePartBodyTagToInitTypePartBody = (
  typePartBodyTag: a.TypePartBodyTag
): d.TypePartBody => {
  switch (typePartBodyTag) {
    case "Product":
      return d.TypePartBody.Product([]);
    case "Sum":
      return d.TypePartBody.Sum([]);
    case "Kernel":
      return d.TypePartBody.Kernel(d.TypePartBodyKernel.String);
  }
};

const locationToInitPageModel = (
  messageHandler: (message: a.Message) => void,
  location: d.Location
): PageModel => {
  switch (location._) {
    case "Home":
      pageHome.init(messageHandler);
      return { tag: pageModelHome };
    case "CreateProject":
      return { tag: pageModelCreateProject };
    case "About":
      return { tag: pageModelAboutTag };
    case "User":
      pageUser.init(messageHandler, location.userId);
      return { tag: pageModelUserTag, userId: location.userId };
    case "Debug":
      return { tag: pageModelDebug, tab: pageDebug.init };
    case "Setting":
      return { tag: pageModelSetting };
    case "Project":
      return {
        tag: pageModelProject,
        projectId: location.projectId,
        state: pageProject.init(messageHandler, location.projectId),
      };
  }
  return { tag: pageModelAboutTag };
};

const pageModelToLocation = (pageModel: PageModel): d.Location => {
  switch (pageModel.tag) {
    case pageModelHome:
      return d.Location.Home;
    case pageModelCreateProject:
      return d.Location.CreateProject;
    case pageModelAboutTag:
      return d.Location.About;
    case pageModelUserTag:
      return d.Location.User(pageModel.userId);
    case pageModelDebug:
      return d.Location.Debug;
    case pageModelSetting:
      return d.Location.Setting;
    case pageModelProject:
      return d.Location.Project(pageModel.projectId);
  }
};

const verifyAccountToken = (
  messageHandler: (message: a.Message) => void,
  accountToken: d.AccountToken
): void => {
  api.getUserByAccountToken(accountToken).then((response) => {
    messageHandler({ tag: a.messageRespondUserByAccountToken, response });
  });
};

const respondUserByAccountToken = (
  response: d.Maybe<d.Maybe<d.IdAndData<d.UserId, d.User>>>,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (response._ === "Nothing") {
    return state;
  }
  if (state.appInterface.logInState._ !== "VerifyingAccountToken") {
    return state;
  }
  const { accountToken } = state.appInterface.logInState;
  const userMaybe = response.value;
  switch (userMaybe._) {
    case "Just": {
      indexedDB.setAccountToken(state.appInterface.logInState.accountToken);
      const requestedImageState = getImage(
        userMaybe.value.data.imageHash,
        messageHandler,
        state
      );
      return {
        appInterface: {
          ...requestedImageState.appInterface,
          logInState: d.LogInState.LoggedIn({
            accountToken,
            userId: userMaybe.value.id,
          }),
          userMap: mapSet(
            requestedImageState.appInterface.userMap,
            userMaybe.value.id,
            d.ResourceState.Loaded({
              getTime: coreUtil.timeFromDate(new Date()),
              data: userMaybe.value.data,
            })
          ),
        },
        pageModel: requestedImageState.pageModel,
      };
    }
    case "Nothing":
      return {
        appInterface: {
          ...state.appInterface,
          logInState: d.LogInState.Guest,
        },
        pageModel: state.pageModel,
      };
  }
};

const requestTop50Project = (
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  api.getTop50Project(undefined).then((response) => {
    messageHandler({ tag: a.messageRespondAllTop50Project, response });
  });
  return {
    appInterface: {
      ...state.appInterface,
      top50ProjectIdState: { _: "Loading" },
    },
    pageModel: state.pageModel,
  };
};

const respondTop50Project = (
  response: d.Maybe<
    d.WithTime<ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>>
  >,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (response._ === "Nothing") {
    return state;
  }
  const projectListData = response.value;
  const imageRequestedState = getImageList(
    projectListData.data.flatMap((projectIdAndData) => [
      projectIdAndData.data.imageHash,
      projectIdAndData.data.iconHash,
    ]),
    messageHandler,
    state
  );
  return {
    appInterface: {
      ...imageRequestedState.appInterface,
      top50ProjectIdState: {
        _: "Loaded",
        projectIdList: projectListData.data.map((idAndData) => idAndData.id),
      },
      projectMap: new Map([
        ...imageRequestedState.appInterface.projectMap,
        ...projectListData.data.map(
          (projectIdAndData) =>
            [
              projectIdAndData.id,
              d.ResourceState.Loaded({
                getTime: response.value.getTime,
                data: projectIdAndData.data,
              }),
            ] as const
        ),
      ]),
    },
    pageModel: imageRequestedState.pageModel,
  };
};

const getUser = (
  userId: d.UserId,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (state.appInterface.userMap.has(userId)) {
    return state;
  }
  api.getUser(userId).then((response) => {
    messageHandler({ tag: a.messageRespondUserTag, userId, response });
  });
  return {
    appInterface: {
      ...state.appInterface,
      userMap: mapSet(
        state.appInterface.userMap,
        userId,
        d.ResourceState.Requesting()
      ),
    },
    pageModel: state.pageModel,
  };
};

const respondUser = (
  messageHandler: (message: a.Message) => void,
  userId: d.UserId,
  response: d.Maybe<d.WithTime<d.Maybe<d.User>>>,
  state: State
): State => {
  const imageRequestedState =
    response._ === "Just" && response.value.data._ === "Just"
      ? getImage(response.value.data.value.imageHash, messageHandler, state)
      : state;
  return {
    appInterface: {
      ...imageRequestedState.appInterface,
      userMap: mapSet(
        imageRequestedState.appInterface.userMap,
        userId,
        getResourceResponseToResourceState(response)
      ),
    },
    pageModel: imageRequestedState.pageModel,
  };
};

const requestProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (state.appInterface.projectMap.has(projectId)) {
    return state;
  }
  api.getProject(projectId).then((response) => {
    messageHandler({ tag: a.messageRespondProject, projectId, response });
  });
  return {
    appInterface: {
      ...state.appInterface,
      projectMap: mapSet(
        state.appInterface.projectMap,
        projectId,
        d.ResourceState.Requesting()
      ),
    },
    pageModel: state.pageModel,
  };
};

const respondProject = (
  projectId: d.ProjectId,
  response: d.Maybe<d.WithTime<d.Maybe<d.Project>>>,
  messageHandler: (message: a.Message) => void,
  state: State
) => {
  const imageRequestedState =
    response._ === "Just" && response.value.data._ === "Just"
      ? getImageList(
          [
            response.value.data.value.iconHash,
            response.value.data.value.imageHash,
          ],
          messageHandler,
          state
        )
      : state;
  return {
    appInterface: {
      ...imageRequestedState.appInterface,
      projectMap: mapSet(
        imageRequestedState.appInterface.projectMap,
        projectId,
        getResourceResponseToResourceState(response)
      ),
    },
    pageModel: imageRequestedState.pageModel,
  };
};

const getImageList = (
  imageTokenList: ReadonlyArray<d.ImageToken>,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  const imageMap = new Map(state.appInterface.imageMap);
  for (const imageToken of imageTokenList) {
    getImageWithCache(imageToken).then((response) => {
      messageHandler({ tag: a.messageRespondImage, imageToken, response });
    });
    imageMap.set(imageToken, d.StaticResourceState.Loading());
  }
  return {
    appInterface: {
      ...state.appInterface,
      imageMap,
    },
    pageModel: state.pageModel,
  };
};

const getImage = (
  imageToken: d.ImageToken,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (state.appInterface.imageMap.has(imageToken)) {
    return state;
  }
  getImageWithCache(imageToken).then((response) => {
    messageHandler({ tag: a.messageRespondImage, imageToken, response });
  });
  return {
    appInterface: {
      ...state.appInterface,
      imageMap: mapSet(
        state.appInterface.imageMap,
        imageToken,
        d.StaticResourceState.Loading()
      ),
    },
    pageModel: state.pageModel,
  };
};

const respondImage = (
  imageToken: d.ImageToken,
  response: d.Maybe<Uint8Array>,
  state: State
): State => {
  return {
    appInterface: {
      ...state.appInterface,
      imageMap: mapSet(
        state.appInterface.imageMap,
        imageToken,
        response._ === "Nothing"
          ? d.StaticResourceState.Unknown<string>()
          : d.StaticResourceState.Loaded<string>(
              window.URL.createObjectURL(
                new Blob([response.value], {
                  type: "image/png",
                })
              )
            )
      ),
    },
    pageModel: state.pageModel,
  };
};

const requestTypePartInProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  if (state.appInterface.getTypePartInProjectState._ === "Requesting") {
    return state;
  }
  api.getTypePartByProjectId(projectId).then((response) => {
    messageHandler({ tag: a.messageRespondTypePartInProject, response });
  });
  return {
    appInterface: {
      ...state.appInterface,
      getTypePartInProjectState: { _: "Requesting", projectId },
    },
    pageModel: state.pageModel,
  };
};

const respondTypePartInProject = (
  response: d.Maybe<
    d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
  >,
  state: State
): State => {
  if (response._ === "Nothing" || response.value.data._ === "Nothing") {
    return {
      appInterface: {
        ...state.appInterface,
        getTypePartInProjectState: { _: "None" },
      },
      pageModel: state.pageModel,
    };
  }
  return {
    appInterface: {
      ...state.appInterface,
      getTypePartInProjectState: { _: "None" },
      typePartMap: new Map([
        ...state.appInterface.typePartMap,
        ...response.value.data.value.map(
          (typePartIdAndData) =>
            [
              typePartIdAndData.id,
              d.ResourceState.Loaded({
                data: typePartIdAndData.data,
                getTime: response.value.getTime,
              }),
            ] as const
        ),
      ]),
    },
    pageModel: state.pageModel,
  };
};

const createProject = (
  projectName: string,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  const accountToken = a.getAccountToken(state.appInterface);
  if (accountToken === undefined || state.appInterface.isCreatingProject) {
    return state;
  }
  api
    .createProject({
      accountToken,
      projectName,
    })
    .then((response) => {
      messageHandler({ tag: a.messageRespondCreatingProject, response });
    });
  return {
    appInterface: {
      ...state.appInterface,
      isCreatingProject: true,
    },
    pageModel: state.pageModel,
  };
};

const respondCreatingProject = (
  response: d.Maybe<d.Maybe<d.IdAndData<d.ProjectId, d.Project>>>,
  state: State
): State => {
  if (response._ === "Nothing" || response.value._ === "Nothing") {
    return {
      appInterface: {
        ...state.appInterface,
        isCreatingProject: false,
      },
      pageModel: state.pageModel,
    };
  }
  return {
    appInterface: {
      ...state.appInterface,
      isCreatingProject: false,
      projectMap: mapSet(
        state.appInterface.projectMap,
        response.value.value.id,
        d.ResourceState.Loaded({
          getTime: coreUtil.timeFromDate(new Date()),
          data: response.value.value.data,
        })
      ),
    },
    pageModel: state.pageModel,
  };
};

const setTypePartList = (
  projectId: d.ProjectId,
  typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>,
  messageHandler: (message: a.Message) => void,
  state: State
): State => {
  const accountToken = a.getAccountToken(state.appInterface);
  if (
    accountToken === undefined ||
    state.appInterface.typePartEditState !== "None"
  ) {
    return state;
  }

  api
    .setTypePartList({
      accountToken,
      projectId,
      typePartList,
    })
    .then((response) => {
      messageHandler({ tag: a.messageRespondSetTypePartList, response });
    });
  return {
    appInterface: {
      ...state.appInterface,
      typePartEditState: "Saving",
    },
    pageModel: state.pageModel,
  };
};

const respondSetTypePartList = (
  response: d.Maybe<
    d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
  >,
  state: State
): State => {
  if (response._ === "Nothing" || response.value.data._ === "Nothing") {
    return {
      appInterface: {
        ...state.appInterface,
        typePartEditState: "Error",
      },
      pageModel: state.pageModel,
    };
  }
  return {
    appInterface: {
      ...state.appInterface,
      typePartEditState: "None",
      typePartMap: new Map([
        ...state.appInterface.typePartMap,
        ...response.value.data.value.map(
          (idAndData) =>
            [
              idAndData.id,
              d.ResourceState.Loaded({
                getTime: response.value.getTime,
                data: idAndData.data,
              }),
            ] as const
        ),
      ]),
    },
    pageModel: state.pageModel,
  };
};

const logIn = (
  messageHandler: (message: a.Message) => void,
  provider: d.OpenIdConnectProvider,
  state: State
): State => {
  api
    .requestLogInUrl({
      openIdConnectProvider: provider,
      urlData: {
        clientMode: state.appInterface.clientMode,
        language: state.appInterface.language,
        location: pageModelToLocation(state.pageModel),
      },
    })
    .then((response) =>
      messageHandler({
        tag: a.messageRespondLogInUrlTag,
        logInUrlMaybe: response,
      })
    );
  return {
    appInterface: {
      ...state.appInterface,
      logInState: d.LogInState.RequestingLogInUrl(provider),
    },
    pageModel: state.pageModel,
  };
};

const respondLogInUrl = (
  logInUrlMaybe: d.Maybe<string>,
  state: State
): State => {
  if (logInUrlMaybe._ === "Nothing") {
    return state;
  }

  requestAnimationFrame(() => {
    window.location.href = logInUrlMaybe.value;
  });
  return {
    appInterface: {
      ...state.appInterface,
      logInState: d.LogInState.JumpingToLogInPage(logInUrlMaybe.value),
    },
    pageModel: state.pageModel,
  };
};

const logOut = (state: State): State => {
  indexedDB.deleteAccountToken();
  return {
    appInterface: {
      ...state.appInterface,
      logInState: d.LogInState.Guest,
    },
    pageModel: state.pageModel,
  };
};

const jump = (
  messageHandler: (message: a.Message) => void,
  location: d.Location,
  language: d.Language,
  state: State
): State => {
  window.history.pushState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        {
          clientMode: state.appInterface.clientMode,
          location,
          language,
        },
        d.Maybe.Nothing()
      )
      .toString()
  );
  return {
    appInterface: {
      ...state.appInterface,
      language,
    },
    pageModel: locationToInitPageModel(messageHandler, location),
  };
};

const changeLocationAndLanguage = (
  messageHandler: (message: a.Message) => void,
  location: d.Location,
  language: d.Language,
  state: State
): State => {
  // 不要だと思われるが一応 正規化する
  window.history.replaceState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        {
          clientMode: state.appInterface.clientMode,
          location,
          language,
        },
        d.Maybe.Nothing()
      )
      .toString()
  );
  return {
    appInterface: {
      ...state.appInterface,
      language,
    },
    pageModel: locationToInitPageModel(messageHandler, location),
  };
};

const generateCode = (
  definyCode: ReadonlyMap<d.TypePartId, d.TypePart>,
  state: State
): State => {
  return {
    appInterface: {
      ...state.appInterface,
      outputCode: generateCodeWithOutErrorHandling(definyCode),
    },
    pageModel: state.pageModel,
  };
};

const generateCodeWithOutErrorHandling = (
  definyCode: ReadonlyMap<d.TypePartId, d.TypePart>
): string => {
  try {
    return core.generateTypeScriptCodeAsString(definyCode);
  } catch (error) {
    return "エラー! " + (error as string);
  }
};

const getResourceResponseToResourceState = <resource extends unknown>(
  response: d.Maybe<d.WithTime<d.Maybe<resource>>>
): d.ResourceState<resource> => {
  if (response._ === "Nothing") {
    return d.ResourceState.Unknown(coreUtil.timeFromDate(new Date()));
  }
  if (response.value.data._ === "Just") {
    return d.ResourceState.Loaded({
      getTime: response.value.getTime,
      data: response.value.data.value,
    });
  }
  return d.ResourceState.Deleted(response.value.getTime);
};

export const stateToView = (state: State): View<Message> => {
  const titleAndAttributeChildren = stateToTitleAndAttributeChildren(state);
  return view(
    {
      title:
        (titleAndAttributeChildren.title === ""
          ? ""
          : titleAndAttributeChildren.title + " | ") + "Definy",
      language: state.appInterface.language,
      themeColor: undefined,
      style: {
        height: "100%",
        display: "grid",
        ...titleAndAttributeChildren.style,
      },
    },
    titleAndAttributeChildren.children
  );
};

const stateToTitleAndAttributeChildren = (
  state: State
): {
  title: string;
  style: CSSObject;
  children: string | ReadonlyMap<string, Element<Message>>;
} => {
  switch (state.appInterface.logInState._) {
    case "RequestingLogInUrl": {
      const message = logInMessage(
        state.appInterface.logInState.openIdConnectProvider,
        state.appInterface.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
    case "JumpingToLogInPage": {
      const message = jumpMessage(
        new URL(state.appInterface.logInState.string),
        state.appInterface.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
  }
  const mainTitleAndElement = main(state);
  return {
    title: mainTitleAndElement.title,
    style: { gridTemplateRows: "48px 1fr" },
    children: c<Message>([
      [
        "header",
        elementMap(headerView(state.appInterface), appMessageToMessage),
      ],
      ["main", mainTitleAndElement.element],
    ]),
  };
};

const prepareLogIn = (message: string): Element<never> =>
  div(
    {
      style: {
        height: "100%",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
      },
    },
    c([["", loadingBox(message)]])
  );

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to ${provider}`;
    case "Esperanto":
      return `Preparante ensaluti al Google${provider}`;
    case "Japanese":
      return `${provider}へのログインを準備中……`;
  }
};

const jumpMessage = (url: URL, language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const main = (state: State): a.TitleAndElement<Message> => {
  switch (state.pageModel.tag) {
    case pageModelHome:
      return a.titleAndElementMap(
        pageHome.view(state.appInterface),
        appMessageToMessage
      );
    case pageModelCreateProject:
      return a.titleAndElementMap(
        pageCreateProject.view(),
        appMessageToMessage
      );
    case pageModelAboutTag:
      return a.titleAndElementMap(
        pageAbout.view(state.appInterface),
        appMessageToMessage
      );
    case pageModelUserTag:
      return a.titleAndElementMap(
        pageUser.view(state.appInterface, state.pageModel.userId),
        appMessageToMessage
      );
    case pageModelDebug:
      return a.titleAndElementMap(
        pageDebug.view(state.appInterface, state.pageModel.tab),
        appMessageToMessage
      );
    case pageModelSetting:
      return a.titleAndElementMap(
        pageSetting.view(state.appInterface),
        appMessageToMessage
      );
    case pageModelProject:
      return a.titleAndElementMap(
        pageProject.view(
          state.appInterface,
          state.pageModel.projectId,
          state.pageModel.state
        ),
        (interfaceMessage) => {
          switch (interfaceMessage.tag) {
            case a.interfaceMessageAppMessageTag:
              return appMessageToMessage(interfaceMessage.message);
            case a.interfaceMessagePageMessageTag:
              return {
                tag: projectPageMessage,
                message: interfaceMessage.message,
              };
          }
        }
      );
  }
};

export const loadingBox = (message: string): Element<never> =>
  div(
    {
      style: {
        display: "grid",
        overflow: "hidden",
        justifyItems: "center",
      },
    },
    c([
      ["message", div({}, message)],
      [
        "logo",
        div(
          {
            style: {
              width: 96,
              height: 96,
              display: "grid",
              justifyItems: "center",
              alignItems: "center",
              borderRadius: "50%",
              animation: `1s ${rotateAnimation} infinite linear`,
              fontSize: 24,
              padding: 8,
              backgroundColor: "#333",
              color: "#ddd",
            },
          },
          "Definy"
        ),
      ],
    ])
  );

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;

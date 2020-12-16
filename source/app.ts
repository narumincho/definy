import * as core from "definy-core";
import * as coreUtil from "definy-core/source/util";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";
import * as pageAbout from "./pageAbout";
import * as pageUser from "./pageUser";
import {
  AppInterface,
  Message,
  messageGenerateCode,
  messageGetImage,
  messageGetProject,
  messageGetTop50Project,
  messageGetTypePartInProject,
  messageGetUserTag,
  messageJumpTag,
  messageLogOut,
  messageRequestLogInTag,
  messageRespondAccountTokenFromIndexedDB,
  messageRespondAllTop50Project,
  messageRespondImage,
  messageRespondLogInUrlTag,
  messageRespondProject,
  messageRespondTypePartInProject,
  messageRespondUserByAccountToken,
  messageRespondUserTag,
} from "./appInterface";
import { Element, View } from "./view/view";
import { c, div, view } from "./view/viewUtil";
import { CSSObject } from "@emotion/react";
import { Header } from "./header";
import { api } from "./api";
import { keyframes } from "@emotion/css";
import { mapSet } from "./util";

export interface State {
  appInterface: AppInterface;
  pageModel: PageModel;
}

export type PageModel =
  | {
      readonly tag: typeof pageModelAboutTag;
    }
  | {
      readonly tag: typeof pageModelUserTag;
      readonly userId: d.UserId;
    };

export const pageModelAboutTag = Symbol("PageModel-About");
export const pageModelUserTag = Symbol("PageModel-User");

export const initState = (
  messageHandler: (message: Message) => void
): State => {
  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    messageHandler({
      tag: messageJumpTag,
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
  const appInterface: AppInterface = {
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
        messageHandler({
          tag: messageRespondAccountTokenFromIndexedDB,
          accountToken,
        });
      });
      break;
    }
    case "VerifyingAccountToken": {
      verifyAccountToken(messageHandler, appInterface.logInState.accountToken);
    }
  }

  return {
    appInterface,
    pageModel: locationToInitPageModel(urlDataAndAccountToken.urlData.location),
  };
};

export const updateState = (
  messageHandler: (message: Message) => void,
  message: Message,
  oldState: State
): State => {
  switch (message.tag) {
    case messageJumpTag:
      return jump(message.location, message.language, oldState);

    case messageRequestLogInTag:
      return logIn(messageHandler, message.provider, oldState);

    case messageRespondLogInUrlTag:
      return respondLogInUrl(message.logInUrlMaybe, oldState);

    case messageLogOut:
      return logOut(oldState);

    case messageGetUserTag:
      return requestUser(message.userId, messageHandler, oldState);

    case messageRespondUserTag:
      return respondUser(message.userId, message.response, oldState);

    case messageRespondAccountTokenFromIndexedDB:
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

    case messageRespondUserByAccountToken:
      return respondUserByAccountToken(message.response, oldState);

    case messageGetTop50Project:
      return requestTop50Project(messageHandler, oldState);

    case messageRespondAllTop50Project:
      return respondTop50Project(message.response, oldState);

    case messageGetProject:
      return requestProject(message.projectId, messageHandler, oldState);

    case messageRespondProject:
      return {
        appInterface: {
          ...oldState.appInterface,
          projectMap: mapSet(
            oldState.appInterface.projectMap,
            message.projectId,
            getResourceResponseToResourceState(message.response)
          ),
        },
        pageModel: oldState.pageModel,
      };

    case messageGetImage:
      return requestImage(message.imageToken, messageHandler, oldState);

    case messageRespondImage:
      return respondImage(message.imageToken, message.response, oldState);

    case messageGenerateCode:
      return generateCode(message.definyCode, oldState);

    case messageGetTypePartInProject:
      return requestTypePartInProject(
        message.projectId,
        messageHandler,
        oldState
      );

    case messageRespondTypePartInProject:
      return respondTypePartInProject(message.response, oldState);
  }
};

const locationToInitPageModel = (location: d.Location): PageModel => {
  switch (location._) {
    case "About":
      return { tag: pageModelAboutTag };
    case "User":
      return { tag: pageModelUserTag, userId: location.userId };
  }
  return { tag: pageModelAboutTag };
};

const pageModelToLocation = (pageModel: PageModel): d.Location => {
  switch (pageModel.tag) {
    case pageModelAboutTag:
      return d.Location.About;
    case pageModelUserTag:
      return d.Location.User(pageModel.userId);
  }
};

const verifyAccountToken = (
  messageHandler: (message: Message) => void,
  accountToken: d.AccountToken
): void => {
  api.getUserByAccountToken(accountToken).then((response) => {
    messageHandler({ tag: messageRespondUserByAccountToken, response });
  });
};

const respondUserByAccountToken = (
  response: d.Maybe<d.Maybe<d.IdAndData<d.UserId, d.User>>>,
  state: State
): State => {
  if (response._ === "Nothing") {
    return state;
  }
  if (state.appInterface.logInState._ !== "VerifyingAccountToken") {
    return state;
  }
  const userMaybe = response.value;
  switch (userMaybe._) {
    case "Just": {
      indexedDB.setAccountToken(state.appInterface.logInState.accountToken);
      return {
        appInterface: {
          ...state.appInterface,
          logInState: d.LogInState.LoggedIn({
            accountToken: state.appInterface.logInState.accountToken,
            userId: userMaybe.value.id,
          }),
          userMap: mapSet(
            state.appInterface.userMap,
            userMaybe.value.id,
            d.ResourceState.Loaded({
              getTime: coreUtil.timeFromDate(new Date()),
              data: userMaybe.value.data,
            })
          ),
        },
        pageModel: state.pageModel,
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
  messageHandler: (message: Message) => void,
  state: State
): State => {
  api.getTop50Project(undefined).then((response) => {
    messageHandler({ tag: messageRespondAllTop50Project, response });
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
  state: State
): State => {
  if (response._ === "Nothing") {
    return state;
  }
  const projectListData = response.value;
  return {
    appInterface: {
      ...state.appInterface,
      top50ProjectIdState: {
        _: "Loaded",
        projectIdList: projectListData.data.map((idAndData) => idAndData.id),
      },
      projectMap: new Map([
        ...state.appInterface.projectMap,
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
    pageModel: state.pageModel,
  };
};

const requestUser = (
  userId: d.UserId,
  messageHandler: (message: Message) => void,
  state: State
): State => {
  if (state.appInterface.userMap.has(userId)) {
    return state;
  }
  api.getUser(userId).then((response) => {
    messageHandler({ tag: messageRespondUserTag, userId, response });
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
  userId: d.UserId,
  response: d.Maybe<d.WithTime<d.Maybe<d.User>>>,
  state: State
): State => {
  return {
    appInterface: {
      ...state.appInterface,
      userMap: mapSet(
        state.appInterface.userMap,
        userId,
        getResourceResponseToResourceState(response)
      ),
    },
    pageModel: state.pageModel,
  };
};

const requestProject = (
  projectId: d.ProjectId,
  messageHandler: (message: Message) => void,
  state: State
): State => {
  if (state.appInterface.projectMap.has(projectId)) {
    return state;
  }
  api.getProject(projectId).then((response) => {
    messageHandler({ tag: messageRespondProject, projectId, response });
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

const requestImage = (
  imageToken: d.ImageToken,
  messageHandler: (message: Message) => void,
  state: State
): State => {
  if (state.appInterface.imageMap.has(imageToken)) {
    return state;
  }
  api.getImageFile(imageToken).then((response) => {
    messageHandler({ tag: messageRespondImage, imageToken, response });
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
  messageHandler: (message: Message) => void,
  state: State
): State => {
  if (state.appInterface.getTypePartInProjectState._ === "Requesting") {
    return state;
  }
  api.getTypePartByProjectId(projectId).then((response) => {
    messageHandler({ tag: messageRespondTypePartInProject, response });
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

const createProject = async (
  projectName: string
): Promise<d.ProjectId | undefined> => {
  if (this.accountToken === undefined || this.isCreatingProject) {
    return;
  }
  this.isCreatingProject = true;
  const response = await api.createProject({
    accountToken: this.accountToken,
    projectName,
  });
  this.isCreatingProject = false;
  if (response._ === "Nothing") {
    return;
  }
  const projectMaybe = response.value;
  switch (projectMaybe._) {
    case "Just": {
      this.projectMap.set(
        projectMaybe.value.id,
        d.ResourceState.Loaded({
          getTime: coreUtil.timeFromDate(new Date()),
          data: projectMaybe.value.data,
        })
      );

      return projectMaybe.value.id;
    }
  }
};

const saveAndAddTypePart = (
  projectId: d.ProjectId,
  typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
): void => {
  if (this.accountToken === undefined || this.typePartEditState !== "None") {
    return;
  }
  const { accountToken } = this;
  this.typePartEditState = "Saving";
  api
    .setTypePartList({
      accountToken,
      projectId,
      typePartList,
    })
    .then((newTypePartList) => {
      if (newTypePartList._ === "Nothing") {
        this.typePartEditState = "Error";
        return;
      }
      const idAndDataList = newTypePartList.value.data;
      if (idAndDataList._ === "Nothing") {
        this.typePartEditState = "Error";
        return;
      }
      for (const { id, data } of idAndDataList.value) {
        this.typePartMap.set(
          id,
          d.ResourceState.Loaded({
            getTime: newTypePartList.value.getTime,
            data,
          })
        );
      }
      this.typePartEditState = "Adding";
      return api.addTypePart({
        accountToken,
        projectId,
      });
    })
    .then((response) => {
      if (response === undefined || response._ === "Nothing") {
        this.typePartEditState = "Error";
        return;
      }
      const typePartListMaybe = response.value.data;
      switch (typePartListMaybe._) {
        case "Just": {
          this.typePartMap.set(
            typePartListMaybe.value.id,
            d.ResourceState.Loaded({
              data: typePartListMaybe.value.data,
              getTime: response.value.getTime,
            })
          );
          this.typePartEditState = "None";
        }
      }
    });
};

const setTypePartList = (
  projectId: d.ProjectId,
  typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
): void => {
  if (this.accountToken === undefined || this.typePartEditState !== "None") {
    return;
  }
  this.typePartEditState = "Saving";
  api
    .setTypePartList({
      accountToken: this.accountToken,
      projectId,
      typePartList,
    })
    .then((newTypePartList) => {
      if (newTypePartList._ === "Nothing") {
        this.typePartEditState = "Error";
        return;
      }
      const idAndDataList = newTypePartList.value.data;
      if (idAndDataList._ === "Nothing") {
        this.typePartEditState = "Error";
        return;
      }
      this.typePartEditState = "None";
      for (const { id, data } of idAndDataList.value) {
        this.typePartMap.set(
          id,
          d.ResourceState.Loaded({
            getTime: newTypePartList.value.getTime,
            data,
          })
        );
      }
    });
};

const logIn = (
  messageHandler: (message: Message) => void,
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
        tag: messageRespondLogInUrlTag,
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
    pageModel: locationToInitPageModel(location),
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
      title: titleAndAttributeChildren.title + " | Definy",
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
  return {
    title: "問題ないぜ",
    style: { gridTemplateRows: "48px 1fr" },
    children: c([
      ["header", Header(state.appInterface)],
      ["main", main(state)],
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

const main = (state: State): Element<Message> => {
  switch (state.pageModel.tag) {
    case pageModelAboutTag:
      return pageAbout.view(state.appInterface);
    case pageModelUserTag:
      return pageUser.view(state.appInterface, state.pageModel.userId);
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

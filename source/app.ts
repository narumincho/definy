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
import * as typePartEditor from "./typePartEditor";
import { CSSObject, keyframes } from "@emotion/css";
import { Element, View } from "./view/view";
import { api, getImageWithCache } from "./api";
import { c, div, elementMap, view } from "./view/viewUtil";
import { mapMapAt, mapSet } from "./util";
import { headerView } from "./header";

export const initState = (
  messageHandler: (message: a.Message) => void
): a.AppInterface => {
  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    messageHandler({
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
    pageModel: locationToInitPageModel(
      messageHandler,
      urlDataAndAccountToken.urlData.location
    ),
  };

  switch (appInterface.logInState._) {
    case "LoadingAccountTokenFromIndexedDB": {
      indexedDB.getAccountToken().then((accountToken) => {
        messageHandler({
          tag: a.messageRespondAccountTokenFromIndexedDB,
          accountToken,
        });
      });
      break;
    }
    case "VerifyingAccountToken": {
      verifyAccountToken(messageHandler, appInterface.logInState.accountToken);
    }
  }

  return appInterface;
};

// eslint-disable-next-line complexity
export const updateStateByMessage = (
  messageHandler: (message: a.Message) => void,
  message: a.Message,
  oldState: a.AppInterface
): a.AppInterface => {
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
          ...oldState,
          logInState: d.LogInState.Guest,
        };
      }
      verifyAccountToken(messageHandler, message.accountToken);
      return {
        ...oldState,
        logInState: d.LogInState.VerifyingAccountToken(message.accountToken),
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
      if (oldState.pageModel.tag !== "Debug") {
        return oldState;
      }
      return {
        ...oldState,
        pageModel: {
          ...oldState.pageModel,
          tab: message.tab,
        },
      };

    case a.messageTypePartMessage:
      return {
        ...oldState,
        typePartMap: mapMapAt(
          oldState.typePartMap,
          message.typePartId,
          (old: d.ResourceState<d.TypePart>): d.ResourceState<d.TypePart> => {
            if (old._ !== "Loaded") {
              return old;
            }
            return d.ResourceState.Loaded({
              data: typePartEditor.update(
                old.dataWithTime.data,
                message.typePartMessage
              ),
              getTime: old.dataWithTime.getTime,
            });
          }
        ),
      };
    case "PageProject":
      if (oldState.pageModel.tag === "Project") {
        return {
          ...oldState,
          pageModel: {
            tag: "Project",
            projectId: oldState.pageModel.projectId,
            state: pageProject.updateSateByLocalMessage(
              oldState.pageModel.state,
              message.message,
              messageHandler
            ),
          },
        };
      }
      return oldState;
  }
};

const locationToInitPageModel = (
  messageHandler: (message: a.Message) => void,
  location: d.Location
): a.PageModel => {
  switch (location._) {
    case "Home":
      pageHome.init(messageHandler);
      return { tag: "Home" };
    case "CreateProject":
      return { tag: "CreateProject" };
    case "About":
      return { tag: "About" };
    case "User":
      pageUser.init(messageHandler, location.userId);
      return { tag: "User", userId: location.userId };
    case "Debug":
      return { tag: "Debug", tab: pageDebug.init };
    case "Setting":
      return { tag: "Setting" };
    case "Project":
      return {
        tag: "Project",
        projectId: location.projectId,
        state: pageProject.init(messageHandler, location.projectId),
      };
  }
  return { tag: "About" };
};

const pageModelToLocation = (pageModel: a.PageModel): d.Location => {
  switch (pageModel.tag) {
    case "Home":
      return d.Location.Home;
    case "CreateProject":
      return d.Location.CreateProject;
    case "About":
      return d.Location.About;
    case "User":
      return d.Location.User(pageModel.userId);
    case "Debug":
      return d.Location.Debug;
    case "Setting":
      return d.Location.Setting;
    case "Project":
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
  state: a.AppInterface
): a.AppInterface => {
  if (response._ === "Nothing") {
    return state;
  }
  if (state.logInState._ !== "VerifyingAccountToken") {
    return state;
  }
  const { accountToken } = state.logInState;
  const userMaybe = response.value;
  switch (userMaybe._) {
    case "Just": {
      indexedDB.setAccountToken(state.logInState.accountToken);
      const requestedImageState = getImage(
        userMaybe.value.data.imageHash,
        messageHandler,
        state
      );
      return {
        ...requestedImageState,
        logInState: d.LogInState.LoggedIn({
          accountToken,
          userId: userMaybe.value.id,
        }),
        userMap: mapSet(
          requestedImageState.userMap,
          userMaybe.value.id,
          d.ResourceState.Loaded({
            getTime: coreUtil.timeFromDate(new Date()),
            data: userMaybe.value.data,
          })
        ),
      };
    }
    case "Nothing":
      return {
        ...state,
        logInState: d.LogInState.Guest,
      };
  }
};

const requestTop50Project = (
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  api.getTop50Project(undefined).then((response) => {
    messageHandler({ tag: a.messageRespondAllTop50Project, response });
  });
  return {
    ...state,
    top50ProjectIdState: { _: "Loading" },
  };
};

const respondTop50Project = (
  response: d.Maybe<
    d.WithTime<ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>>
  >,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
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
    ...imageRequestedState,
    top50ProjectIdState: {
      _: "Loaded",
      projectIdList: projectListData.data.map((idAndData) => idAndData.id),
    },
    projectMap: new Map([
      ...imageRequestedState.projectMap,
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
  };
};

const getUser = (
  userId: d.UserId,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  if (state.userMap.has(userId)) {
    return state;
  }
  api.getUser(userId).then((response) => {
    messageHandler({ tag: a.messageRespondUserTag, userId, response });
  });
  return {
    ...state,
    userMap: mapSet(state.userMap, userId, d.ResourceState.Requesting()),
  };
};

const respondUser = (
  messageHandler: (message: a.Message) => void,
  userId: d.UserId,
  response: d.Maybe<d.WithTime<d.Maybe<d.User>>>,
  state: a.AppInterface
): a.AppInterface => {
  const imageRequestedState =
    response._ === "Just" && response.value.data._ === "Just"
      ? getImage(response.value.data.value.imageHash, messageHandler, state)
      : state;
  return {
    ...imageRequestedState,
    userMap: mapSet(
      imageRequestedState.userMap,
      userId,
      getResourceResponseToResourceState(response)
    ),
  };
};

const requestProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  if (state.projectMap.has(projectId)) {
    return state;
  }
  api.getProject(projectId).then((response) => {
    messageHandler({ tag: a.messageRespondProject, projectId, response });
  });
  return {
    ...state,
    projectMap: mapSet(
      state.projectMap,
      projectId,
      d.ResourceState.Requesting()
    ),
  };
};

const respondProject = (
  projectId: d.ProjectId,
  response: d.Maybe<d.WithTime<d.Maybe<d.Project>>>,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
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
    ...imageRequestedState,
    projectMap: mapSet(
      imageRequestedState.projectMap,
      projectId,
      getResourceResponseToResourceState(response)
    ),
  };
};

const getImageList = (
  imageTokenList: ReadonlyArray<d.ImageToken>,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  const imageMap = new Map(state.imageMap);
  for (const imageToken of imageTokenList) {
    getImageWithCache(imageToken).then((response) => {
      messageHandler({ tag: a.messageRespondImage, imageToken, response });
    });
    imageMap.set(imageToken, d.StaticResourceState.Loading());
  }
  return {
    ...state,
    imageMap,
  };
};

const getImage = (
  imageToken: d.ImageToken,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  if (state.imageMap.has(imageToken)) {
    return state;
  }
  getImageWithCache(imageToken).then((response) => {
    messageHandler({ tag: a.messageRespondImage, imageToken, response });
  });
  return {
    ...state,
    imageMap: mapSet(
      state.imageMap,
      imageToken,
      d.StaticResourceState.Loading()
    ),
  };
};

const respondImage = (
  imageToken: d.ImageToken,
  response: d.Maybe<Uint8Array>,
  state: a.AppInterface
): a.AppInterface => {
  return {
    ...state,
    imageMap: mapSet(
      state.imageMap,
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
  };
};

const requestTypePartInProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  if (state.getTypePartInProjectState._ === "Requesting") {
    return state;
  }
  api.getTypePartByProjectId(projectId).then((response) => {
    messageHandler({ tag: a.messageRespondTypePartInProject, response });
  });
  return {
    ...state,
    getTypePartInProjectState: { _: "Requesting", projectId },
  };
};

const respondTypePartInProject = (
  response: d.Maybe<
    d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
  >,
  state: a.AppInterface
): a.AppInterface => {
  if (response._ === "Nothing" || response.value.data._ === "Nothing") {
    return {
      ...state,
      getTypePartInProjectState: { _: "None" },
    };
  }
  return {
    ...state,
    getTypePartInProjectState: { _: "None" },
    typePartMap: new Map([
      ...state.typePartMap,
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
  };
};

const createProject = (
  projectName: string,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  const accountToken = a.getAccountToken(state);
  if (accountToken === undefined || state.isCreatingProject) {
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
    ...state,
    isCreatingProject: true,
  };
};

const respondCreatingProject = (
  response: d.Maybe<d.Maybe<d.IdAndData<d.ProjectId, d.Project>>>,
  state: a.AppInterface
): a.AppInterface => {
  if (response._ === "Nothing" || response.value._ === "Nothing") {
    return {
      ...state,
      isCreatingProject: false,
    };
  }
  return {
    ...state,
    isCreatingProject: false,
    projectMap: mapSet(
      state.projectMap,
      response.value.value.id,
      d.ResourceState.Loaded({
        getTime: coreUtil.timeFromDate(new Date()),
        data: response.value.value.data,
      })
    ),
  };
};

const setTypePartList = (
  projectId: d.ProjectId,
  typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>,
  messageHandler: (message: a.Message) => void,
  state: a.AppInterface
): a.AppInterface => {
  const accountToken = a.getAccountToken(state);
  if (accountToken === undefined || state.typePartEditState !== "None") {
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
    ...state,
    typePartEditState: "Saving",
  };
};

const respondSetTypePartList = (
  response: d.Maybe<
    d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
  >,
  state: a.AppInterface
): a.AppInterface => {
  if (response._ === "Nothing" || response.value.data._ === "Nothing") {
    return {
      ...state,
      typePartEditState: "Error",
    };
  }
  return {
    ...state,
    typePartEditState: "None",
    typePartMap: new Map([
      ...state.typePartMap,
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
  };
};

const logIn = (
  messageHandler: (message: a.Message) => void,
  provider: d.OpenIdConnectProvider,
  state: a.AppInterface
): a.AppInterface => {
  api
    .requestLogInUrl({
      openIdConnectProvider: provider,
      urlData: {
        clientMode: state.clientMode,
        language: state.language,
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
    ...state,
    logInState: d.LogInState.RequestingLogInUrl(provider),
  };
};

const respondLogInUrl = (
  logInUrlMaybe: d.Maybe<string>,
  state: a.AppInterface
): a.AppInterface => {
  if (logInUrlMaybe._ === "Nothing") {
    return state;
  }

  requestAnimationFrame(() => {
    window.location.href = logInUrlMaybe.value;
  });
  return {
    ...state,
    logInState: d.LogInState.JumpingToLogInPage(logInUrlMaybe.value),
  };
};

const logOut = (state: a.AppInterface): a.AppInterface => {
  indexedDB.deleteAccountToken();
  return {
    ...state,
    logInState: d.LogInState.Guest,
  };
};

const jump = (
  messageHandler: (message: a.Message) => void,
  location: d.Location,
  language: d.Language,
  state: a.AppInterface
): a.AppInterface => {
  window.history.pushState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        {
          clientMode: state.clientMode,
          location,
          language,
        },
        d.Maybe.Nothing()
      )
      .toString()
  );
  return {
    ...state,
    language,
    pageModel: locationToInitPageModel(messageHandler, location),
  };
};

const changeLocationAndLanguage = (
  messageHandler: (message: a.Message) => void,
  location: d.Location,
  language: d.Language,
  state: a.AppInterface
): a.AppInterface => {
  // 不要だと思われるが一応 正規化する
  window.history.replaceState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        {
          clientMode: state.clientMode,
          location,
          language,
        },
        d.Maybe.Nothing()
      )
      .toString()
  );
  return {
    ...state,
    language,
    pageModel: locationToInitPageModel(messageHandler, location),
  };
};

const generateCode = (
  definyCode: ReadonlyMap<d.TypePartId, d.TypePart>,
  state: a.AppInterface
): a.AppInterface => {
  return {
    ...state,
    outputCode: generateCodeWithOutErrorHandling(definyCode),
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

export const stateToView = (state: a.AppInterface): View<a.Message> => {
  const titleAndAttributeChildren = stateToTitleAndAttributeChildren(state);
  return view(
    {
      title:
        (titleAndAttributeChildren.title === ""
          ? ""
          : titleAndAttributeChildren.title + " | ") + "Definy",
      language: state.language,
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
  state: a.AppInterface
): {
  title: string;
  style: CSSObject;
  children: string | ReadonlyMap<string, Element<a.Message>>;
} => {
  switch (state.logInState._) {
    case "RequestingLogInUrl": {
      const message = logInMessage(
        state.logInState.openIdConnectProvider,
        state.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
    case "JumpingToLogInPage": {
      const message = jumpMessage(
        new URL(state.logInState.string),
        state.language
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
    children: c<a.Message>([
      ["header", headerView(state)],
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

const main = (state: a.AppInterface): a.TitleAndElement<a.Message> => {
  switch (state.pageModel.tag) {
    case "Home":
      return pageHome.view(state);
    case "CreateProject":
      return pageCreateProject.view();
    case "About":
      return pageAbout.view(state);
    case "User":
      return pageUser.view(state, state.pageModel.userId);
    case "Debug":
      return pageDebug.view(state, state.pageModel.tab);
    case "Setting":
      return pageSetting.view(state);
    case "Project":
      return pageProject.view(
        state,
        state.pageModel.projectId,
        state.pageModel.state
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

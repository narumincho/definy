import * as a from "./messageAndState";
import * as commonUrl from "../common/url";
import * as core from "../core/main";
import * as coreUtil from "../core/util";
import * as d from "../data";
import * as indexedDB from "./indexedDB";
import * as jsTsCodeGenerator from "../gen/jsTs/main";
import * as page from "./page";
import * as pageCreateProject from "./page/createProject";
import * as pageProject from "./page/project";
import * as typePartEditor from "./ui/typePartEditor";
import { CSSObject, keyframes } from "@emotion/css";
import { mapMapAt, mapSet } from "./util";
import { view, viewUtil } from "@narumincho/html";
import { api } from "./api";
import { headerView } from "./ui/header";

export const initState = (
  messageHandler: (message: a.Message) => void
): a.State => {
  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = commonUrl.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    messageHandler({
      tag: a.messageChangeLocationAndLanguage,
      language: newUrlData.language,
      location: newUrlData.location,
    });
  });

  const urlDataAndAccountToken = commonUrl.urlDataAndAccountTokenFromUrl(
    new URL(window.location.href)
  );
  // ブラウザのURLを正規化 アクセストークンを隠す
  window.history.replaceState(
    undefined,
    "",
    commonUrl
      .urlDataAndAccountTokenToUrl(
        urlDataAndAccountToken.urlData,
        d.Maybe.Nothing()
      )
      .toString()
  );
  const state: a.State = {
    top50ProjectIdState: { _: "None" },
    projectMap: new Map(),
    userMap: new Map(),
    typePartMap: new Map(),
    isCreatingProject: false,
    typePartEditState: "None",
    getTypePartInProjectState: { _: "None" },
    language: urlDataAndAccountToken.urlData.language,
    logInState:
      urlDataAndAccountToken.accountToken._ === "Just"
        ? d.LogInState.VerifyingAccountToken(
            urlDataAndAccountToken.accountToken.value
          )
        : d.LogInState.LoadingAccountTokenFromIndexedDB,
    outputCode: { tag: "notGenerated" },
    pageState: page.locationToInitPageState(
      messageHandler,
      urlDataAndAccountToken.urlData.location
    ),
    typeSearchText: "",
  };

  switch (state.logInState._) {
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
      verifyAccountToken(messageHandler, state.logInState.accountToken);
    }
  }

  return state;
};

// eslint-disable-next-line complexity
export const updateStateByMessage = (
  messageHandler: (message: a.Message) => void,
  message: a.Message,
  oldState: a.State
): a.State => {
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

    case a.messageGenerateCode:
      return generateCode(oldState);

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
      return respondCreatingProject(message.response, oldState, messageHandler);

    case a.messageSetTypePartList:
      return setTypePartList(message.projectId, messageHandler, oldState);

    case a.messageRespondTypePartList:
      return respondSetTypePartList(message.response, oldState);

    case a.messageSelectDebugPageTab:
      if (oldState.pageState.tag !== "Debug") {
        return oldState;
      }
      return {
        ...oldState,
        pageState: {
          ...oldState.pageState,
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
    case "AddTypePart":
      return addTypePart(oldState, message.projectId, messageHandler);
    case "PageProject":
      if (oldState.pageState.tag === "Project") {
        return {
          ...oldState,
          pageState: {
            tag: "Project",
            projectId: oldState.pageState.projectId,
            state: pageProject.updateSateByLocalMessage(
              oldState.pageState.state,
              message.message,
              messageHandler
            ),
          },
        };
      }
      return oldState;

    case "SaveTypePart":
      return saveTypePart(oldState, message.typePartId, messageHandler);

    case "RespondSavingTypePart":
      return responseSavingTypePart(
        oldState,
        message.typePartId,
        message.response
      );

    case "AddTypePartNoSave":
      return addTypePartNoSave(oldState, message.projectId, messageHandler);

    case "RespondAddTypePart":
      return respondAddTypePart(oldState, message.response);

    case "SetTypeSearchText":
      return {
        ...oldState,
        typeSearchText: message.text,
      };

    case "CreateProjectPageMessage":
      if (oldState.pageState.tag === "CreateProject") {
        return {
          ...oldState,
          pageState: {
            tag: "CreateProject",
            state: pageCreateProject.update(
              message.message,
              oldState.pageState.state,
              messageHandler
            ),
          },
        };
      }
      return oldState;
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
  response: d.Maybe<d.Maybe<d.IdAndData<d.AccountId, d.Account>>>,
  messageHandler: (message: a.Message) => void,
  state: a.State
): a.State => {
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
      return {
        ...state,
        logInState: d.LogInState.LoggedIn({
          accountToken,
          userId: userMaybe.value.id,
        }),
        userMap: mapSet(
          state.userMap,
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
  state: a.State
): a.State => {
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
  state: a.State
): a.State => {
  if (response._ === "Nothing") {
    return state;
  }
  const projectListData = response.value;
  return {
    ...state,
    top50ProjectIdState: {
      _: "Loaded",
      projectIdList: projectListData.data.map((idAndData) => idAndData.id),
    },
    projectMap: new Map([
      ...state.projectMap,
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
  userId: d.AccountId,
  messageHandler: (message: a.Message) => void,
  state: a.State
): a.State => {
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
  userId: d.AccountId,
  response: d.Maybe<d.WithTime<d.Maybe<d.Account>>>,
  state: a.State
): a.State => {
  return {
    ...state,
    userMap: mapSet(
      state.userMap,
      userId,
      getResourceResponseToResourceState(response)
    ),
  };
};

const requestProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: a.State
): a.State => {
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
  state: a.State
) => {
  return {
    ...state,
    projectMap: mapSet(
      state.projectMap,
      projectId,
      getResourceResponseToResourceState(response)
    ),
  };
};

const requestTypePartInProject = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: a.State
): a.State => {
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
  state: a.State
): a.State => {
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
  state: a.State
): a.State => {
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
  state: a.State,
  messageHandler: (message: a.Message) => void
): a.State => {
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
    pageState: page.locationToInitPageState(
      messageHandler,
      d.Location.Project(response.value.value.id)
    ),
  };
};

const setTypePartList = (
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void,
  state: a.State
): a.State => {
  const accountToken = a.getAccountToken(state);
  if (accountToken === undefined || state.typePartEditState !== "None") {
    return state;
  }
  const typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>> = [
    ...state.typePartMap,
  ].flatMap(
    ([typePartId, resource]): ReadonlyArray<
      d.IdAndData<d.TypePartId, d.TypePart>
    > => {
      if (resource._ === "Loaded") {
        return [
          {
            id: typePartId,
            data: resource.dataWithTime.data,
          },
        ];
      }
      return [];
    }
  );

  api
    .setTypePartList({
      accountToken,
      projectId,
      typePartList,
    })
    .then((response) => {
      messageHandler({ tag: a.messageRespondTypePartList, response });
    });
  return {
    ...state,
    typePartEditState: "Saving",
  };
};

const saveTypePart = (
  oldState: a.State,
  typePartId: d.TypePartId,
  messageHandler: (message: a.Message) => void
): a.State => {
  if (oldState.typePartEditState !== "None") {
    return oldState;
  }
  const accountToken = a.getAccountToken(oldState);
  if (accountToken === undefined) {
    return oldState;
  }
  const resource = oldState.typePartMap.get(typePartId);
  if (resource === undefined) {
    return oldState;
  }
  if (resource._ !== "Loaded") {
    return oldState;
  }
  api
    .setTypePart({
      accountToken,
      typePart: resource.dataWithTime.data,
      typePartId,
    })
    .then((response) => {
      messageHandler({ tag: "RespondSavingTypePart", typePartId, response });
    });
  return {
    ...oldState,
    typePartEditState: "Saving",
  };
};

const responseSavingTypePart = (
  oldState: a.State,
  typePartId: d.TypePartId,
  response: d.Maybe<d.WithTime<d.Maybe<d.TypePart>>>
): a.State => {
  if (response._ === "Nothing") {
    // 1つの型パーツ保存に失敗した
    return oldState;
  }
  const typePartMaybe = response.value.data;
  if (typePartMaybe._ === "Nothing") {
    return oldState;
  }

  return {
    ...oldState,
    typePartMap: new Map([
      ...oldState.typePartMap,
      [
        typePartId,
        d.ResourceState.Loaded({
          data: typePartMaybe.value,
          getTime: response.value.getTime,
        }),
      ],
    ]),
    typePartEditState: "None",
  };
};

const addTypePartNoSave = (
  oldState: a.State,
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void
): a.State => {
  if (oldState.typePartEditState !== "None") {
    return oldState;
  }
  const accountToken = a.getAccountToken(oldState);
  if (accountToken === undefined) {
    return oldState;
  }
  api
    .addTypePart({
      accountToken,
      projectId,
    })
    .then((response) => {
      messageHandler({ tag: "RespondAddTypePart", response });
    });
  return {
    ...oldState,
    typePartEditState: "Adding",
  };
};

const respondAddTypePart = (
  oldState: a.State,
  response: d.Maybe<d.WithTime<d.Maybe<d.IdAndData<d.TypePartId, d.TypePart>>>>
): a.State => {
  if (response._ === "Nothing") {
    return oldState;
  }
  const idAndDataMaybe = response.value.data;
  if (idAndDataMaybe._ === "Nothing") {
    return oldState;
  }
  return {
    ...oldState,
    typePartMap: new Map([
      ...oldState.typePartMap,
      [
        idAndDataMaybe.value.id,
        d.ResourceState.Loaded({
          getTime: response.value.getTime,
          data: idAndDataMaybe.value.data,
        }),
      ],
    ]),
    typePartEditState: "None",
  };
};

const respondSetTypePartList = (
  response: d.Maybe<
    d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
  >,
  state: a.State
): a.State => {
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

const addTypePart = (
  state: a.State,
  projectId: d.ProjectId,
  messageHandler: (message: a.Message) => void
): a.State => {
  const accountToken = a.getAccountToken(state);
  if (accountToken === undefined || state.typePartEditState !== "None") {
    return state;
  }
  const typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>> = [
    ...state.typePartMap,
  ].flatMap(
    ([typePartId, resource]): ReadonlyArray<
      d.IdAndData<d.TypePartId, d.TypePart>
    > => {
      if (resource._ === "Loaded") {
        return [
          {
            id: typePartId,
            data: resource.dataWithTime.data,
          },
        ];
      }
      return [];
    }
  );

  api
    .setTypePartListAndAddTypePart({
      accountToken,
      projectId,
      typePartList,
    })
    .then((response) => {
      messageHandler({ tag: a.messageRespondTypePartList, response });
    });
  return {
    ...state,
    typePartEditState: "Saving",
  };
};

const logIn = (
  messageHandler: (message: a.Message) => void,
  provider: d.OpenIdConnectProvider,
  state: a.State
): a.State => {
  api
    .requestLogInUrl({
      openIdConnectProvider: provider,
      urlData: {
        language: state.language,
        location: page.pageStateToLocation(state.pageState),
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
  state: a.State
): a.State => {
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

const logOut = (state: a.State): a.State => {
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
  state: a.State
): a.State => {
  window.history.pushState(
    undefined,
    "",
    commonUrl
      .urlDataAndAccountTokenToUrl(
        {
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
    pageState: page.locationToInitPageState(messageHandler, location),
  };
};

const changeLocationAndLanguage = (
  messageHandler: (message: a.Message) => void,
  location: d.Location,
  language: d.Language,
  state: a.State
): a.State => {
  // 不要だと思われるが一応 正規化する
  window.history.replaceState(
    undefined,
    "",
    commonUrl
      .urlDataAndAccountTokenToUrl(
        {
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
    pageState: page.locationToInitPageState(messageHandler, location),
  };
};

const generateCode = (state: a.State): a.State => {
  const definyCode: Map<d.TypePartId, d.TypePart> = new Map();
  for (const [typePartId, resource] of state.typePartMap) {
    if (resource._ === "Loaded") {
      definyCode.set(typePartId, resource.dataWithTime.data);
    }
  }
  return {
    ...state,
    outputCode: generateCodeWithOutErrorHandling(definyCode),
  };
};

const generateCodeWithOutErrorHandling = (
  definyCode: ReadonlyMap<d.TypePartId, d.TypePart>
): a.OutputCode => {
  try {
    const jsTsCode = core.generateTypeScriptCode(definyCode);

    return {
      tag: "generated",
      typeScript: jsTsCodeGenerator.generateCodeAsString(
        jsTsCode,
        "TypeScript"
      ),
      javaScript: jsTsCodeGenerator.generateCodeAsString(
        jsTsCode,
        "JavaScript"
      ),
      elm: core.generateElmCodeAsString(definyCode),
    };
  } catch (error) {
    return {
      tag: "error",
      errorMessage: "エラー! " + (error as string),
    };
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

export const stateToView = (state: a.State): view.View<a.Message> => {
  const titleAndAttributeChildren = stateToTitleAndAttributeChildren(state);
  return {
    pageName:
      (titleAndAttributeChildren.title === ""
        ? ""
        : titleAndAttributeChildren.title + " | ") + "Definy",
    description: "Definy の 説明",
    twitterCard: "SummaryCardWithLargeImage",
    coverImageUrl: new URL("https://narumincho.com/assets/icon.png"),
    scriptUrlList: [],
    styleUrlList: [],
    iconPath: "wip.png",
    url: new URL(commonUrl.origin),
    appName: "Definy",
    language: state.language,
    themeColor: undefined,
    bodyClass: viewUtil.styleToBodyClass({
      height: "100%",
      display: "grid",
      ...titleAndAttributeChildren.style,
    }),
    children: view.childrenElementList(titleAndAttributeChildren.children),
  };
};

const stateToTitleAndAttributeChildren = (
  state: a.State
): {
  title: string;
  style: CSSObject;
  children: ReadonlyMap<string, view.Element<a.Message>>;
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
        children: viewUtil.c([["", prepareLogIn(message)]]),
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
        children: viewUtil.c([["", prepareLogIn(message)]]),
      };
    }
  }
  const mainTitleAndElement = page.titleAndElement(state);
  return {
    title: mainTitleAndElement.title,
    style: { gridTemplateRows: "48px 1fr" },
    children: viewUtil.c<a.Message>([
      ["header", headerView(state)],
      ["main", mainTitleAndElement.element],
    ]),
  };
};

const prepareLogIn = (message: string): view.Element<never> =>
  viewUtil.div(
    {
      style: {
        height: "100%",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
      },
    },
    viewUtil.c([["", loadingBox(message)]])
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

export const loadingBox = (message: string): view.Element<never> =>
  viewUtil.div(
    {
      style: {
        display: "grid",
        overflow: "hidden",
        justifyItems: "center",
      },
    },
    viewUtil.c([
      ["message", viewUtil.div({}, message)],
      [
        "logo",
        viewUtil.div(
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

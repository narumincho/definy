/** @jsx jsx */

import * as React from "react";
import * as core from "definy-core";
import {
  AccessToken,
  Binary,
  Codec,
  IdAndData,
  ImageToken,
  Language,
  List,
  Location,
  Maybe,
  OpenIdConnectProvider,
  Project,
  ProjectId,
  RequestLogInUrlRequestData,
  String,
  UrlData,
  User,
  UserId,
} from "definy-core/source/data";
import { LogInState, Model } from "./model";
import { Resource, TokenResource } from "./data";
import { About } from "./About";
import { Debug } from "./Debug";
import { Home } from "./Home";
import { LoadingBox } from "./ui";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: Codec<responseType>
): Promise<responseType> =>
  fetch(`https://us-central1-definy-lang.cloudfunctions.net/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

export const App: React.FC<{
  accessToken: Maybe<AccessToken>;
  initUrlData: UrlData;
}> = (prop) => {
  const [urlData, onJump] = React.useState<UrlData>(prop.initUrlData);
  const [logInState, setLogInState] = React.useState<LogInState>(
    prop.accessToken._ === "Just"
      ? { _: "WaitVerifyingAccessToken", accessToken: prop.accessToken.value }
      : { _: "Guest" }
  );
  const [projectData, setProjectData] = React.useState<
    ReadonlyMap<ProjectId, Resource<Maybe<Project>>>
  >(new Map());
  const [allProjectIdListMaybe, setAllProjectIdList] = React.useState<
    Maybe<Resource<ReadonlyArray<ProjectId>>>
  >(Maybe.Nothing);

  const [userData, setUserData] = React.useState<
    ReadonlyMap<UserId, Resource<Maybe<User>>>
  >(new Map());

  const [imageData, setImageData] = React.useState<
    ReadonlyMap<ImageToken, TokenResource<string>>
  >(new Map());

  // ルーティング
  React.useEffect(() => {
    window.history.pushState(
      undefined,
      "",
      core.urlDataAndAccessTokenToUrl(urlData, Maybe.Nothing()).toString()
    );
    window.addEventListener("popstate", () => {
      onJump(
        core.urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
  }, [urlData]);

  // ログイン
  React.useEffect(
    logInEffect(logInState, urlData, setLogInState, setUserData),
    [logInState]
  );

  // プロジェクトの一覧
  React.useEffect(() => {
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
        setAllProjectIdList(Maybe.Just(Resource.WaitRequesting()));
        return;
      case "Loading":
        return;
      case "WaitRequesting":
        setAllProjectIdList(Maybe.Just(Resource.Requesting()));
        callApi(
          "getAllProject",
          [],
          List.codec(IdAndData.codec(ProjectId.codec, Project.codec))
        ).then((idAndProjectList) => {
          setProjectData(
            new Map(
              idAndProjectList.map((project) => [
                project.id,
                Resource.Loaded(Maybe.Just(project.data)),
              ])
            )
          );
          setAllProjectIdList(
            Maybe.Just(
              Resource.Loaded(idAndProjectList.map((project) => project.id))
            )
          );
        });
        return;

      case "Requesting":
        return;
      case "WaitUpdating":
        console.log("サーバーに問い合わせてプロジェクトの一覧を更新する予定");
        return;

      case "Updating":
        return;
      case "WaitRetrying":
        console.log("サーバーに問い合わせてプロジェクトの一覧を再取得する予定");
    }
  }, [allProjectIdListMaybe]);

  React.useEffect(() => {
    const newProjectData = new Map(projectData);
    let isChanged = false;
    for (const [projectId, projectResource] of projectData) {
      switch (projectResource._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newProjectData.set(projectId, TokenResource.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newProjectData.set(projectId, TokenResource.Requesting());
          callApi(
            "getProject",
            ProjectId.codec.encode(projectId),
            Project.codec
          ).then((project) => {
            setProjectData((dict) => {
              const newDict = new Map(dict);
              newDict.set(projectId, TokenResource.Loaded(Maybe.Just(project)));
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
      setProjectData(newProjectData);
    }
  }, [projectData]);

  React.useEffect(() => {
    const newUserData = new Map(userData);
    let isChanged = false;
    for (const [userId, userResource] of userData) {
      switch (userResource._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newUserData.set(userId, TokenResource.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newUserData.set(userId, TokenResource.Requesting());
          callApi("getUser", UserId.codec.encode(userId), User.codec).then(
            (project) => {
              setUserData((dict) => {
                const newDict = new Map(dict);
                newDict.set(userId, TokenResource.Loaded(Maybe.Just(project)));
                return newDict;
              });
            }
          );
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
      setUserData(newUserData);
    }
  }, [userData]);

  React.useEffect(() => {
    const newImageData = new Map(imageData);
    let isChanged = false;
    for (const [imageToken, imageDataItem] of imageData) {
      switch (imageDataItem._) {
        case "Loaded":
          break;
        case "WaitLoading":
          isChanged = true;
          newImageData.set(imageToken, TokenResource.WaitRequesting());
          break;
        case "Loading":
          break;
        case "WaitRequesting":
          isChanged = true;
          newImageData.set(imageToken, TokenResource.Requesting());
          callApi(
            "getImageFile",
            ImageToken.codec.encode(imageToken),
            Binary.codec
          ).then((binary) => {
            setImageData((dict) => {
              const newDict = new Map(dict);
              newDict.set(
                imageToken,
                TokenResource.Loaded(
                  window.URL.createObjectURL(
                    new Blob([binary], {
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
      setImageData(newImageData);
    }
  }, [imageData]);

  const model: Model = {
    clientMode: urlData.clientMode,
    language: urlData.language,
    logInState,
    projectData,
    userData,
    imageData,
    onJump,
    allProjectIdListMaybe,
    requestAllProject: () => {
      if (allProjectIdListMaybe._ === "Nothing") {
        setAllProjectIdList(Maybe.Just(Resource.WaitLoading()));
      }
    },
    requestProject: (projectId: ProjectId) => {
      if (projectData.get(projectId) === undefined) {
        setProjectData((dict) => {
          const newDict = new Map(dict);
          newDict.set(projectId, Resource.WaitLoading());
          return newDict;
        });
      }
    },
    requestUser: (userId: UserId) => {
      if (userData.get(userId) === undefined) {
        setUserData((dict) => {
          const newDict = new Map(dict);
          newDict.set(userId, Resource.WaitLoading());
          return newDict;
        });
      }
    },
    requestImage: (imageToken: ImageToken) => {
      if (imageData.get(imageToken) === undefined) {
        setImageData((dict) => {
          const newDict = new Map(dict);
          newDict.set(imageToken, TokenResource.WaitLoading());
          return newDict;
        });
      }
    },
  };

  switch (logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return (
        <RequestingLogInUrl
          message={logInMessage(logInState.provider, urlData.language)}
        />
      );
    case "JumpingToLogInPage":
      return (
        <RequestingLogInUrl
          message={jumpMessage(logInState.logInUrl, urlData.language)}
        />
      );
  }
  return (
    <div
      css={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
      }}
    >
      <SidePanel
        model={model}
        onRequestLogIn={(provider) => {
          setLogInState({ _: "WaitRequestingLogInUrl", provider });
        }}
      />
      <MainPanel location={urlData.location} model={model} />
    </div>
  );
};

const RequestingLogInUrl: React.FC<{
  message: string;
}> = (prop) => (
  <div
    css={{
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    }}
  >
    <LoadingBox>{prop.message}</LoadingBox>
  </div>
);

const logInMessage = (
  provider: OpenIdConnectProvider,
  language: Language
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

const jumpMessage = (url: URL, language: Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const MainPanel: React.FC<{
  model: Model;
  location: Location;
}> = (prop) => {
  switch (prop.location._) {
    case "Home":
      return <Home model={prop.model} />;
    case "About":
      return <About />;
    case "Debug":
      return <Debug />;
    default:
      return <div>他のページは準備中</div>;
  }
};

const logInEffect = (
  logInState: LogInState,
  urlData: UrlData,
  dispatchLogInState: React.Dispatch<React.SetStateAction<LogInState>>,
  dispatchUserData: React.Dispatch<
    React.SetStateAction<ReadonlyMap<UserId, Resource<Maybe<User>>>>
  >
): React.EffectCallback => () => {
  switch (logInState._) {
    case "Guest":
      return;
    case "WaitRequestingLogInUrl":
      dispatchLogInState({
        _: "RequestingLogInUrl",
        provider: logInState.provider,
      });
      callApi(
        "requestLogInUrl",
        RequestLogInUrlRequestData.codec.encode({
          openIdConnectProvider: logInState.provider,
          urlData,
        }),
        String.codec
      ).then((logInUrl) => {
        dispatchLogInState({
          _: "JumpingToLogInPage",
          logInUrl: new URL(logInUrl),
        });
      });
      return;
    case "JumpingToLogInPage":
      window.location.href = logInState.logInUrl.toString();
      return;
    case "WaitVerifyingAccessToken":
      dispatchLogInState({
        _: "VerifyingAccessToken",
        accessToken: logInState.accessToken,
      });
      callApi(
        "getUserByAccessToken",
        AccessToken.codec.encode(logInState.accessToken),
        IdAndData.codec(UserId.codec, User.codec)
      ).then((userSnapshotAndId) => {
        dispatchLogInState({
          _: "LoggedIn",
          accessToken: logInState.accessToken,
          userId: userSnapshotAndId.id,
        });
        dispatchUserData(
          (userData): ReadonlyMap<UserId, Resource<Maybe<User>>> =>
            new Map([
              ...userData,
              [
                userSnapshotAndId.id,
                Resource.Loaded(Maybe.Just(userSnapshotAndId.data)),
              ],
            ])
        );
      });
  }
};

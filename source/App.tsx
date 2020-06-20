/** @jsx jsx */

import * as React from "react";
import { LogInState, Model } from "./model";
import { Resource, TokenResource } from "./data";
import {
  data,
  urlDataAndAccessTokenFromUrl,
  urlDataAndAccessTokenToUrl,
} from "definy-common";
import { About } from "./About";
import { Debug } from "./Debug";
import { Home } from "./Home";
import { LoadingBox } from "./ui";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: data.Codec<responseType>
): Promise<responseType> =>
  fetch(`https://us-central1-definy-lang.cloudfunctions.net/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

export const App: React.FC<{
  accessToken: data.Maybe<data.AccessToken>;
  initUrlData: data.UrlData;
}> = (prop) => {
  const [urlData, onJump] = React.useState<data.UrlData>(prop.initUrlData);
  const [logInState, dispatchLogInState] = React.useState<LogInState>(
    prop.accessToken._ === "Just"
      ? { _: "WaitVerifyingAccessToken", accessToken: prop.accessToken.value }
      : { _: "Guest" }
  );
  const [projectData, dispatchProject] = React.useState<
    ReadonlyMap<data.ProjectId, Resource<data.Maybe<data.Project>>>
  >(new Map());
  const [allProjectIdListMaybe, dispatchAllProjectIdList] = React.useState<
    data.Maybe<Resource<ReadonlyArray<data.ProjectId>>>
  >(data.Maybe.Nothing);

  const [userData, dispatchUserData] = React.useState<
    ReadonlyMap<data.UserId, Resource<data.Maybe<data.User>>>
  >(new Map());

  const [imageData, dispatchImageData] = React.useState<
    ReadonlyMap<data.ImageToken, TokenResource<string>>
  >(new Map());

  React.useEffect(() => {
    const update = () => {
      new Date().getTime();
      /*
       * 現時刻を取得してリソースの中で期限が切れたものをリクエストしていく?
       */
      window.requestAnimationFrame(update);
    };
    update();
  });

  // ルーティング
  React.useEffect(() => {
    window.history.pushState(
      undefined,
      "",
      urlDataAndAccessTokenToUrl(urlData, data.Maybe.Nothing()).toString()
    );
    window.addEventListener("popstate", () => {
      onJump(
        urlDataAndAccessTokenFromUrl(new URL(window.location.href)).urlData
      );
    });
  }, [urlData]);

  // ログイン
  React.useEffect(
    logInEffect(logInState, urlData, dispatchLogInState, dispatchUserData),
    [logInState]
  );

  // プロジェクトの一覧
  React.useEffect(() => {
    console.log({ allProjectIdListMaybe });
    if (allProjectIdListMaybe._ === "Nothing") {
      return;
    }
    const allProjectIdList = allProjectIdListMaybe.value;
    switch (allProjectIdList._) {
      case "Loaded":
      case "Unknown":
        return;
      case "WaitLoading":
        dispatchAllProjectIdList(data.Maybe.Just(Resource.Loading()));
        /*
         * indexedDBにアクセスして取得
         * 代わりに失敗したということでWaitRequestingにする
         */
        dispatchAllProjectIdList(data.Maybe.Just(Resource.WaitRequesting()));
        return;
      case "Loading":
        return;
      case "WaitRequesting":
        dispatchAllProjectIdList(data.Maybe.Just(Resource.Requesting()));
        callApi(
          "getAllProject",
          [],
          data.List.codec(
            data.IdAndData.codec(data.ProjectId.codec, data.Project.codec)
          )
        ).then((idAndProjectList) => {
          dispatchProject(
            new Map(
              idAndProjectList.map((project) => [
                project.id,
                Resource.Loaded(data.Maybe.Just(project.data)),
              ])
            )
          );
          dispatchAllProjectIdList(
            data.Maybe.Just(
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
    for (const [imageToken, imageDataItem] of imageData) {
      switch (imageDataItem._) {
        case "Loaded":
          return;
        case "WaitLoading":
          dispatchImageData((dict) => {
            const newDict = new Map(dict);
            newDict.set(imageToken, TokenResource.Loading());
            return newDict;
          });
          // indexedDBから画像データを読み取る
          dispatchImageData((dict) => {
            const newDict = new Map(dict);
            newDict.set(imageToken, TokenResource.WaitRequesting());
            return newDict;
          });
          return;
        case "Loading":
          return;
        case "WaitRequesting":
          dispatchImageData((dict) => {
            const newDict = new Map(dict);
            newDict.set(imageToken, TokenResource.Requesting());
            return newDict;
          });
          callApi(
            "getImageFile",
            data.ImageToken.codec.encode(imageToken),
            data.Binary.codec
          ).then((binary) => {
            dispatchImageData((dict) => {
              console.log("binary", binary);
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
          return;
        case "Requesting":
          return;
        case "WaitRetrying":
          console.log("再度画像のリクエストをする予定");
          return;
        case "Retrying":
          return;
        case "Unknown":
          return;
      }
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
        dispatchAllProjectIdList(data.Maybe.Just(Resource.WaitLoading()));
      }
    },
    requestImage: (imageToken: data.ImageToken) => {
      if (imageData.get(imageToken) === undefined) {
        return dispatchImageData(
          new Map([...imageData, [imageToken, TokenResource.WaitLoading()]])
        );
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
          dispatchLogInState({ _: "WaitRequestingLogInUrl", provider });
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
  provider: data.OpenIdConnectProvider,
  language: data.Language
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

const jumpMessage = (url: URL, language: data.Language) => {
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
  location: data.Location;
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
  urlData: data.UrlData,
  dispatchLogInState: React.Dispatch<React.SetStateAction<LogInState>>,
  dispatchUserData: React.Dispatch<
    React.SetStateAction<
      ReadonlyMap<data.UserId, Resource<data.Maybe<data.User>>>
    >
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
        data.RequestLogInUrlRequestData.codec.encode({
          openIdConnectProvider: logInState.provider,
          urlData,
        }),
        data.String.codec
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
        data.AccessToken.codec.encode(logInState.accessToken),
        data.IdAndData.codec(data.UserId.codec, data.User.codec)
      ).then((userSnapshotAndId) => {
        dispatchLogInState({
          _: "LoggedIn",
          accessToken: logInState.accessToken,
          userId: userSnapshotAndId.id,
        });
        dispatchUserData(
          (
            userData
          ): ReadonlyMap<data.UserId, Resource<data.Maybe<data.User>>> =>
            new Map([
              ...userData,
              [
                userSnapshotAndId.id,
                Resource.Loaded(data.Maybe.Just(userSnapshotAndId.data)),
              ],
            ])
        );
      });
  }
};

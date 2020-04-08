import { Elm } from "../elm/source/Main.elm";
import * as common from "definy-common";
import { data } from "definy-common";
import * as db from "./indexedDB";

const elmAppElement = document.createElement("div");

// bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(elmAppElement);

const getAccessToken = async (
  database: IDBDatabase | null,
  accessTokenFromUrl: data.Maybe<data.AccessToken>
): Promise<data.Maybe<data.AccessToken>> => {
  switch (accessTokenFromUrl._) {
    case "Just":
      return data.maybeJust(accessTokenFromUrl.value);
    case "Nothing": {
      const accessToken = await db.getAccessToken(database);
      if (accessToken === undefined) {
        return data.maybeNothing();
      }
      return data.maybeJust(accessToken);
    }
  }
};

const imageBlobUrlMap: Map<string, string> = new Map();

const callApi = <responseType>(
  apiName: string,
  binary: ReadonlyArray<number>,
  decodeFunction: (
    index: number,
    binary: Uint8Array
  ) => { result: responseType; nextIndex: number }
): Promise<responseType> =>
  fetch("https://us-central1-definy-lang.cloudfunctions.net/api/" + apiName, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => decodeFunction(0, new Uint8Array(response)).result);

const init = async (): Promise<void> => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.ts", { scope: "/" }).then(
      () => {
        console.log("serviceWorkerを登録した!");
      },
      () => {
        console.log("serviceWorkerの登録に失敗しました");
      }
    );
  }
  const database = await db.accessDatabase();

  const accessToken = await getAccessToken(
    database,
    common.urlDataAndAccessTokenFromUrl(new URL(location.href)).accessToken
  );
  if (accessToken._ === "Just") {
    db.setAccessToken(database, accessToken.value);
  }
  const app = Elm.Main.init({
    flags: {
      windowSize: {
        width: innerWidth,
        height: innerHeight,
      },
      accessTokenMaybe: accessToken._ === "Just" ? accessToken.value : null,
      networkConnection: navigator.onLine,
    },
    node: elmAppElement,
  });

  let prevKeyEvent: KeyboardEvent;
  /* キー入力 */
  window.addEventListener("keydown", (e) => {
    prevKeyEvent = e;
    app.ports.keyPressed.send(e);
  });
  /*
   * 直前のキー入力のデフォルト動作を取り消す
   * なぜかElmのコンパイルをデバッグモードでやるとキー動作を防げない
   */
  app.ports.preventDefaultBeforeKeyEvent.subscribe(() => {
    console.log("直前のキー入力のデフォルト動作を取り消す", prevKeyEvent);
    if (prevKeyEvent.currentTarget === null) {
      console.log(
        "キーイベントの送信先オブジェクトがない!キー動作を無効化できないと思われる"
      );
    }
    prevKeyEvent.preventDefault();
    app.ports.keyPrevented.send(null);
  });
  /* ウィンドウサイズを変えたら */
  addEventListener("resize", (): void => {
    app.ports.windowResize.send({
      width: innerWidth,
      height: innerHeight,
    });
  });

  app.ports.consoleLog.subscribe((text) => {
    console.warn(text);
  });

  addEventListener("pointerup", () => {
    app.ports.subPointerUp.send(null);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      app.ports.subPointerUp.send(null);
    }
  });

  addEventListener("online", () => {
    app.ports.changeNetworkConnection.send(true);
  });

  addEventListener("offline", () => {
    app.ports.changeNetworkConnection.send(false);
  });

  app.ports.requestLogInUrl.subscribe((requestData) => {
    callApi(
      "requestLogInUrl",
      data.encodeRequestLogInUrlRequestData(requestData),
      data.decodeString
    ).then((url) => {
      location.href = url;
    });
  });

  app.ports.getUserByAccessToken.subscribe((accessToken) => {
    callApi(
      "getUserByAccessToken",
      data.encodeToken(accessToken),
      data.decodeMaybe(data.decodeUserSnapshotAndId)
    ).then((maybeUserPublicAndUserId) => {
      app.ports.responseUserByAccessToken.send(maybeUserPublicAndUserId);
      if (maybeUserPublicAndUserId._ === "Just") {
        db.setUser(
          database,
          maybeUserPublicAndUserId.value.id,
          maybeUserPublicAndUserId.value.snapshot
        );
      }
    });
  });

  app.ports.getImageBlobUrl.subscribe((fileHash) => {
    const blobUrl = imageBlobUrlMap.get(fileHash);
    if (blobUrl !== undefined) {
      app.ports.getImageBlobResponse.send({
        blobUrl: blobUrl,
        fileHash: fileHash,
      });
      return;
    }
    db.getFile(database, fileHash).then((binaryInIndexDB) => {
      if (binaryInIndexDB !== undefined) {
        const blob = new Blob([binaryInIndexDB], { type: "image/png" });
        const blobUrl = URL.createObjectURL(blob);
        imageBlobUrlMap.set(fileHash, blobUrl);
        app.ports.getImageBlobResponse.send({
          blobUrl: blobUrl,
          fileHash: fileHash,
        });
        return;
      }
      callApi(
        "getImageFile",
        data.encodeToken(fileHash),
        data.decodeBinary
      ).then((pngBinary) => {
        const blob = new Blob([pngBinary], { type: "image/png" });
        const blobUrl = URL.createObjectURL(blob);
        db.setFile(database, fileHash, pngBinary);
        imageBlobUrlMap.set(fileHash, blobUrl);
        app.ports.getImageBlobResponse.send({
          blobUrl: blobUrl,
          fileHash: fileHash,
        });
      });
    });
  });
  app.ports.createProject.subscribe((parameter) => {
    callApi(
      "createProject",
      data.encodeCreateProjectParameter(parameter),
      data.decodeMaybe(common.data.decodeProjectSnapshotAndId)
    ).then((response) => {
      if (response._ === "Just") {
        db.setProject(database, response.value.id, response.value.snapshot);
      }
      app.ports.createProjectResponse.send(response);
      console.log("プロジェクト作成しました!", response);
    });
  });
  app.ports.toValidProjectName.subscribe((projectName) => {
    app.ports.toValidProjectNameResponse.send({
      input: projectName,
      result: common.stringToValidProjectName(projectName),
    });
  });
  app.ports.getAllProjectIdList.subscribe(() => {
    callApi("getAllProjectId", [], data.decodeList(data.decodeId)).then(
      (idList) => {
        const projectIdList = idList as ReadonlyArray<common.data.ProjectId>;
        console.log("すべてのプロジェクトのID", projectIdList);
        app.ports.responseAllProjectId.send(projectIdList);
      }
    );
  });
  app.ports.getProject.subscribe((projectId) => {
    db.getProject(database, projectId).then((projectDataInIndexedDB) => {
      if (projectDataInIndexedDB !== undefined) {
        app.ports.responseProject.send({
          id: projectId,
          snapshot: data.maybeJust(projectDataInIndexedDB),
        });
        return;
      }
      callApi(
        "getProject",
        data.encodeId(projectId),
        data.decodeMaybe(data.decodeProjectSnapshot)
      ).then((projectMaybe) => {
        if (projectMaybe._ === "Just") {
          db.setProject(database, projectId, projectMaybe.value);
          app.ports.responseProject.send({
            id: projectId,
            snapshot: data.maybeJust(projectMaybe.value),
          });
          return;
        }
        app.ports.responseProject.send({
          id: projectId,
          snapshot: data.maybeNothing(),
        });
      });
    });
  });
};

requestAnimationFrame(() => {
  init();
});

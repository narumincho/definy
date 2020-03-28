import { Elm } from "../elm/source/Main.elm";
import * as common from "definy-common";

const elmAppElement = document.createElement("div");

// bodyの子要素を削除
document.documentElement.replaceChild(
  document.body.cloneNode(false),
  document.body
);
document.body.appendChild(elmAppElement);

const getAccessToken = async (
  urlData: common.data.UrlData
): Promise<common.data.Maybe<common.data.AccessToken>> => {
  switch (urlData.accessToken._) {
    case "Just":
      return urlData.accessToken;
    case "Nothing":
      return getAccessTokenFromIndexDB();
  }
};

const imageBlobUrlMap: Map<string, string> = new Map();

const getAccessTokenFromIndexDB = (): Promise<common.data.Maybe<
  common.data.AccessToken
>> =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      console.log("indexDBをサポートしていなかった");
      resolve(common.data.maybeNothing());
    }
    const userDBRequest: IDBOpenDBRequest = indexedDB.open("user", 1);

    userDBRequest.onupgradeneeded = (event): void => {
      console.log("ユーザーデータのDBが更新された");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      db.createObjectStore("accessToken", {});
    };

    userDBRequest.onsuccess = (event): void => {
      let accessToken: common.data.Maybe<common.data.AccessToken> = common.data.maybeNothing();
      console.log("ユーザーデータのDBに接続成功!");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      console.log("db in success", db);
      const transaction = db.transaction("accessToken", "readonly");
      transaction.oncomplete = (): void => {
        console.log("アクセストークン読み込みのトランザクションが成功した");
        db.close();
        resolve(accessToken);
      };
      transaction.onerror = (): void => {
        console.log("アクセストークン読み込みのトランザクションが失敗した");
        db.close();
        reject("read AccessToken Error: transaction failed");
      };
      const getRequest = transaction
        .objectStore("accessToken")
        .get("lastLogInUser");
      getRequest.onsuccess = (event): void => {
        console.log("読み込み完了!");
        const request = event.target as IDBRequest;
        if (request.result === undefined) {
          return;
        }
        if (typeof request.result === "string") {
          accessToken = common.data.maybeJust(
            request.result as common.data.AccessToken
          );
          return;
        }
        reject("read AccessToken Error: AccessToken is not string");
      };
      getRequest.onerror = (): void => {
        console.log("読み込み失敗");
        reject("read AccessToken Error: Read Error");
      };
    };

    userDBRequest.onerror = (): void => {
      console.log("ユーザーデータのDBに接続できなかった");
    };
  });

const writeAccessToken = (
  accessToken: common.data.AccessToken
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      console.log("indexDBをサポートしていなかった");
      resolve();
    }

    const userDBRequest: IDBOpenDBRequest = indexedDB.open("user", 1);

    userDBRequest.onupgradeneeded = (event): void => {
      console.log("ユーザーデータのDBが更新された");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      db.createObjectStore("accessToken", {});
    };

    userDBRequest.onsuccess = (event): void => {
      console.log("ユーザーデータのDBに接続成功!");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      const transaction = db.transaction("accessToken", "readwrite");
      transaction.oncomplete = (): void => {
        console.log("アクセストークン保存のトランザクションが成功した");
        db.close();
        resolve();
      };
      transaction.onerror = (): void => {
        console.log("アクセストークン保存のトランザクションが失敗した");
        db.close();
        reject("Write AccessToken Error: transaction failed");
      };
      const putRequest = transaction
        .objectStore("accessToken")
        .put(accessToken, "lastLogInUser");

      putRequest.onsuccess = (): void => {
        console.log("書き込み完了!");
      };
      putRequest.onerror = (): void => {
        console.log("読み込み失敗");
      };
    };

    userDBRequest.onerror = (): void => {
      console.log("ユーザーデータのDBに接続できなかった");
    };
  });

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
    headers: [["content-type", "application/octet-stream"]]
  })
    .then(response => response.arrayBuffer())
    .then(response => decodeFunction(0, new Uint8Array(response)).result);

const init = async (): Promise<void> => {
  const urlData = common.urlDataFromUrl(new URL(location.href));
  console.log(urlData);
  history.replaceState(
    "",
    "",
    common
      .urlDataToUrl({ ...urlData, accessToken: common.data.maybeNothing() })
      .toString()
  );

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

  const accessToken = await getAccessToken(urlData);
  if (accessToken._ === "Just") {
    writeAccessToken(accessToken.value);
  }
  const app = Elm.Main.init({
    flags: {
      windowSize: {
        width: innerWidth,
        height: innerHeight
      },
      urlData: { ...urlData, accessToken: accessToken },
      networkConnection: navigator.onLine
    },
    node: elmAppElement
  });

  let prevKeyEvent: KeyboardEvent;
  /* キー入力 */
  window.addEventListener("keydown", e => {
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
      height: innerHeight
    });
  });

  app.ports.consoleLog.subscribe(text => {
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

  app.ports.requestLogInUrl.subscribe(requestData => {
    callApi(
      "requestLogInUrl",
      common.data.encodeRequestLogInUrlRequestData(requestData),
      common.data.decodeString
    ).then(url => {
      location.href = url;
    });
  });

  app.ports.getUserByAccessToken.subscribe(accessToken => {
    callApi(
      "getUserByAccessToken",
      common.data.encodeToken(accessToken),
      common.data.decodeMaybe(common.data.decodeUserPublicAndUserId)
    ).then(maybeUserPublicAndUserId => {
      app.ports.responseUserByAccessToken.send(maybeUserPublicAndUserId);
    });
  });

  app.ports.getImageBlobUrl.subscribe(fileHash => {
    const blobUrl = imageBlobUrlMap.get(fileHash);
    if (blobUrl !== undefined) {
      app.ports.getImageBlobResponse.send({
        blobUrl: blobUrl,
        fileHash: fileHash
      });
      return;
    }
    callApi(
      "getImageFile",
      common.data.encodeToken(fileHash),
      common.data.decodeBinary
    ).then(pngBinary => {
      const blob = new Blob([pngBinary], { type: "image/png" });
      const blobUrl = URL.createObjectURL(blob);
      imageBlobUrlMap.set(fileHash, blobUrl);
      app.ports.getImageBlobResponse.send({
        blobUrl: blobUrl,
        fileHash: fileHash
      });
    });
  });
  app.ports.pushUrl.subscribe(urlData => {
    console.log("pushUrlを呼んだ");
    history.pushState(
      "",
      "",
      common
        .urlDataToUrl({ ...urlData, accessToken: common.data.maybeNothing() })
        .toString()
    );
  });
  addEventListener("popstate", () => {
    app.ports.urlChanged.send(common.urlDataFromUrl(new URL(location.href)));
  });
};

requestAnimationFrame(() => {
  init();
});

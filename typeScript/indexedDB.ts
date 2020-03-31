import * as common from "definy-common";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";

/**
 * indexDBからアクセストークンを取得する
 */
export const getAccessToken = (): Promise<null | common.data.AccessToken> =>
  new Promise((resolve, reject) => {
    if (!checkIndexDBSupport()) {
      resolve(null);
    }
    const userDBRequest: IDBOpenDBRequest = indexedDB.open("user", 1);

    userDBRequest.onupgradeneeded = (event): void => {
      console.log("ユーザーデータのDBが更新された");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      db.createObjectStore(accessTokenObjectStoreName, {});
    };

    userDBRequest.onsuccess = (event): void => {
      let accessToken: null | common.data.AccessToken = null;
      console.log("ユーザーデータのDBに接続成功!");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      console.log("db in success", db);
      const transaction = db.transaction(
        accessTokenObjectStoreName,
        "readonly"
      );
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
        .objectStore(accessTokenObjectStoreName)
        .get(accessTokenKeyName);
      getRequest.onsuccess = (event): void => {
        console.log("読み込み完了!");
        const request = event.target as IDBRequest;
        if (request.result === undefined) {
          return;
        }
        if (typeof request.result === "string") {
          accessToken = request.result as common.data.AccessToken;
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

/**
 * indexDBにアクセストークンを書き込む
 * @param accessToken アクセストークン
 */
export const writeAccessToken = (
  accessToken: common.data.AccessToken
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!checkIndexDBSupport()) {
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
      const transaction = db.transaction(
        accessTokenObjectStoreName,
        "readwrite"
      );
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
        .objectStore(accessTokenObjectStoreName)
        .put(accessToken, accessTokenKeyName);

      putRequest.onsuccess = (): void => {
        console.log("書き込み完了!");
      };
      putRequest.onerror = (): void => {
        console.error("読み込み失敗");
      };
    };

    userDBRequest.onerror = (): void => {
      console.error("ユーザーデータのDBに接続できなかった");
    };
  });

/**
 * ブラウザでindexDBがサポートされているかどうか調べる
 */
const checkIndexDBSupport = (): boolean => "indexedDB" in window;

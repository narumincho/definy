import { data } from "definy-common";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";
const imageObjectStoreName = "image";

/**
 * ブラウザでindexDBがサポートされているかどうか調べる
 */
const checkIndexDBSupport = (): boolean => "indexedDB" in window;

/**
 * データベースにアクセスする.
 * ブラウザがindexedDBがサポートされていない場合,nullが返る
 * Databaseにアクセスできなかったとき,rejectされる
 */
export const accessDatabase = (): Promise<IDBDatabase | null> =>
  new Promise<IDBDatabase | null>((resolve, reject) => {
    if (!checkIndexDBSupport()) {
      resolve(null);
    }
    const dbRequest: IDBOpenDBRequest = indexedDB.open("main", 1);

    dbRequest.onupgradeneeded = (event): void => {
      console.log("ユーザーデータのDBが更新された");
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      db.createObjectStore(accessTokenObjectStoreName, {});
      db.createObjectStore(imageObjectStoreName, {});
    };

    dbRequest.onsuccess = (event): void => {
      const target = event.target as IDBOpenDBRequest;
      resolve(target.result);
    };

    dbRequest.onerror = (): void => {
      console.log("Databaseに接続できなかった");
      reject();
    };
  });
/**
 * indexDBからアクセストークンを取得する
 */
export const getAccessToken = (
  database: IDBDatabase | null
): Promise<null | data.AccessToken> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      return resolve(null);
    }
    let accessToken: null | data.AccessToken = null;
    const transaction = database.transaction(
      accessTokenObjectStoreName,
      "readonly"
    );
    transaction.oncomplete = (): void => {
      console.log("アクセストークン読み込みのトランザクションが成功した");
      resolve(accessToken);
    };
    transaction.onerror = (): void => {
      console.log("アクセストークン読み込みのトランザクションが失敗した");
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
        accessToken = request.result as data.AccessToken;
        return;
      }
      reject("read AccessToken Error: AccessToken is not string");
    };
    getRequest.onerror = (): void => {
      console.log("読み込み失敗");
      reject("read AccessToken Error: Read Error");
    };
  });

/**
 * indexDBにアクセストークンを書き込む
 * @param database nullだった場合サポートされていないとみなされ常に何も取得できない
 * @param accessToken アクセストークン
 */
export const setAccessToken = (
  database: IDBDatabase | null,
  accessToken: data.AccessToken
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      return resolve();
    }
    const transaction = database.transaction(
      accessTokenObjectStoreName,
      "readwrite"
    );
    transaction.oncomplete = (): void => {
      console.log("アクセストークン保存のトランザクションが成功した");
      resolve();
    };
    transaction.onerror = (): void => {
      console.log("アクセストークン保存のトランザクションが失敗した");
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
  });

export const getUser = (
  database: IDBDatabase | null,
  userId: data.UserId
): Promise<null | data.UserPublic> =>
  new Promise((resolve, reject) => {
    resolve(null);
  });

export const setUser = (
  userId: data.UserId | null,
  userData: data.UserPublic
): Promise<void> =>
  new Promise((resolve, reject) => {
    resolve();
  });

/**
 * PNG形式の画像を読み込む
 */
export const getImage = (
  database: IDBDatabase | null,
  fileHash: data.FileHash
): Promise<null | Uint8Array> =>
  new Promise((resolve, reject) => {
    resolve();
  });

/**
 * PNG形式の画像を書き込む
 */
export const setImage = (
  fileHash: data.FileHash,
  image: Uint8Array
): Promise<void> =>
  new Promise((resolve, reject) => {
    resolve();
  });

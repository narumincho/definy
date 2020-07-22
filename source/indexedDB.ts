import * as util from "definy-core/source/util";
import { AccessToken, Resource } from "definy-core/source/data";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";

/**
 * ブラウザでindexDBがサポートされているかどうか調べる
 */
const checkIndexDBSupport = (): boolean => "indexedDB" in window;

const databaseCache: IDBDatabase | null = null;

/**
 * データベースにアクセスする.
 * ブラウザがindexedDBがサポートされていない場合,nullが返る
 * Databaseにアクセスできなかったとき,rejectされる
 */
export const getDatabase = (): Promise<IDBDatabase | null> =>
  new Promise<IDBDatabase | null>((resolve, reject) => {
    if (databaseCache !== null) {
      resolve(databaseCache);
      return;
    }
    if (!checkIndexDBSupport()) {
      resolve(null);
    }
    const dbRequest: IDBOpenDBRequest = indexedDB.open("main", 1);

    dbRequest.onupgradeneeded = (): void => {
      console.log("Databaseのversionが上がった");
      const db = dbRequest.result;
      db.createObjectStore(accessTokenObjectStoreName, {});
    };

    dbRequest.onsuccess = (): void => {
      resolve(dbRequest.result);
    };

    dbRequest.onerror = (): void => {
      console.log("Databaseに接続できなかった");
      reject(new Error("indexed connection error"));
    };
  });

/**
 * データをindexedDBから読む
 */
const get = <id extends string, data>(
  objectStoreName: string,
  id: id
): Promise<data | undefined> =>
  new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (database === null) {
        resolve();
        return;
      }
      const transaction = database.transaction([objectStoreName], "readwrite");

      transaction.oncomplete = (): void => {
        resolve(getRequest.result);
      };

      transaction.onerror = (): void => {
        reject(new Error("read " + objectStoreName + " failed"));
      };

      const getRequest: IDBRequest<data | undefined> = transaction
        .objectStore(objectStoreName)
        .get(id);
    });
  });

/**
 * データをindexedDBに書く
 */
const set = <id extends string, data>(
  objectStoreName: string,
  id: id,
  data: data
): Promise<void> =>
  new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (database === null) {
        resolve();
        return;
      }

      const transaction = database.transaction([objectStoreName], "readwrite");

      transaction.oncomplete = (): void => {
        resolve();
      };

      transaction.onerror = (): void => {
        reject(
          new Error(
            "write " + objectStoreName + " error: write transaction failed"
          )
        );
      };

      transaction.objectStore(objectStoreName).put(data, id);
    });
  });

/**
 * リソースデータをindexedDBに書く
 *
 * 指定したIDのデータがなかった場合, 指定したデータをindexedDBに書く
 * 指定したデータのgetTimeが 前にあったデータのgetTimeより新しかった場合, 指定したデータをindexedDBに書く
 * そうでなければ何もしない
 */
const setResource = <id extends string, data>(
  objectStoreName: string,
  id: id,
  resource: Resource<data>
): Promise<void> =>
  new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (database === null) {
        resolve();
        return;
      }

      const transaction = database.transaction([objectStoreName], "readonly");

      transaction.oncomplete = (): void => {
        if (getRequest.result === undefined) {
          set(objectStoreName, id, resource).then(resolve);
          return;
        }
        if (
          util.timeToDate(getRequest.result.getTime).getTime() <
          util.timeToDate(resource.getTime).getTime()
        ) {
          set(objectStoreName, id, resource).then(resolve);
          return;
        }
        resolve();
      };

      transaction.onerror = (): void => {
        reject(
          new Error("set before get getTime " + objectStoreName + " failed")
        );
      };

      const getRequest: IDBRequest<
        undefined | Resource<data>
      > = transaction.objectStore(objectStoreName).get(id);
    });
  });

/**
 * indexDBからアクセストークンを取得する
 */
export const getAccessToken = (): Promise<undefined | AccessToken> =>
  get<typeof accessTokenKeyName, AccessToken>(
    accessTokenObjectStoreName,
    accessTokenKeyName
  );

/**
 * indexDBにアクセストークンを書き込む
 * @param database nullだった場合サポートされていないとみなされ常に何も取得できない
 * @param accessToken アクセストークン
 */
export const setAccessToken = (accessToken: AccessToken): Promise<void> =>
  set<typeof accessTokenKeyName, AccessToken>(
    accessTokenObjectStoreName,
    accessTokenKeyName,
    accessToken
  );

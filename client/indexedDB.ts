import * as d from "../common/zodType";

const AccountTokenObjectStoreName = "AccountToken";
const AccountTokenKeyName = "lastLogInUser";

/**
 * ブラウザでindexDBがサポートされているかどうか調べる
 */
const checkIndexDBSupport = (): boolean => "indexedDB" in window;

/**
 * 1度 indexedDBにアクセスしたら, データベースへの参照を維持しておくための変数
 */
let databaseCache: IDBDatabase | null = null;

/**
 * データベースにアクセスする.
 * ブラウザがindexedDBがサポートされていない場合,nullが返る
 * Databaseにアクセスできなかったとき,rejectされる
 */
const getDatabase = (): Promise<IDBDatabase | null> =>
  new Promise<IDBDatabase | null>((resolve, reject) => {
    if (databaseCache !== null) {
      resolve(databaseCache);
      return;
    }
    if (!checkIndexDBSupport()) {
      resolve(null);
    }
    const dbRequest: IDBOpenDBRequest = indexedDB.open("main", 2);

    dbRequest.onupgradeneeded = (): void => {
      console.log("Databaseのversionが上がった");
      databaseCache = dbRequest.result;
      databaseCache.createObjectStore(AccountTokenObjectStoreName, {});
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
        resolve(undefined);
        return;
      }
      const transaction = database.transaction([objectStoreName], "readonly");

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

const deleteValue = <id extends string>(
  objectStoreName: string,
  id: id
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
            "delete " + objectStoreName + " error: delete transaction failed"
          )
        );
      };

      transaction.objectStore(objectStoreName).delete(id);
    });
  });

/**
 * indexDBからアクセストークンを取得する
 */
export const getAccountToken = (): Promise<undefined | d.AccountToken> =>
  get<typeof AccountTokenKeyName, d.AccountToken>(
    AccountTokenObjectStoreName,
    AccountTokenKeyName
  );

/**
 * indexDBにアクセストークンを書き込む
 * @param AccountToken アクセストークン
 */
export const setAccountToken = (AccountToken: d.AccountToken): Promise<void> =>
  set<typeof AccountTokenKeyName, d.AccountToken>(
    AccountTokenObjectStoreName,
    AccountTokenKeyName,
    AccountToken
  );

/**
 * indexedDBからアクセストークンを削除する
 */
export const deleteAccountToken = (): Promise<void> =>
  deleteValue<typeof AccountTokenKeyName>(
    AccountTokenObjectStoreName,
    AccountTokenKeyName
  );

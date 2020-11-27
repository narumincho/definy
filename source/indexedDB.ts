import * as d from "definy-core/source/data";
import * as util from "definy-core/source/util";

const AccountTokenObjectStoreName = "AccountToken";
const imageObjectStoreName = "image";
const AccountTokenKeyName = "lastLogInUser";

/**
 * ブラウザでindexDBがサポートされているかどうか調べる
 */
const checkIndexDBSupport = (): boolean => "indexedDB" in window;

let databaseCache: IDBDatabase | null = null;

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
      databaseCache = dbRequest.result;
      databaseCache.createObjectStore(AccountTokenObjectStoreName, {});
      databaseCache.createObjectStore(imageObjectStoreName, {});
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
            "write " + objectStoreName + " error: write transaction failed"
          )
        );
      };

      transaction.objectStore(objectStoreName).delete(id);
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
  resource: d.WithTime<data>
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
        undefined | d.WithTime<data>
      > = transaction.objectStore(objectStoreName).get(id);
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

/**
 * indexedDBに画像データのキャッシュを書き込む
 * @param imageToken 画像のハッシュ値
 * @param imagePngBinary PNGの画像バイナリのデータ
 */
export const setImage = (
  imageToken: d.ImageToken,
  imagePngBinary: Uint8Array
): Promise<void> =>
  set<d.ImageToken, Uint8Array>(
    imageObjectStoreName,
    imageToken,
    imagePngBinary
  );

/**
 * indexedDBから画像データを読み込む
 * @param imageToken 画像のハッシュ値
 */
export const getImage = (
  imageToken: d.ImageToken
): Promise<Uint8Array | undefined> =>
  get<d.ImageToken, Uint8Array>(imageObjectStoreName, imageToken);

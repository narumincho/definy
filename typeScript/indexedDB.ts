import { data } from "definy-common";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";
const userObjectStoreName = "user";
const projectObjectStoreName = "project";
const fileObjectStoreName = "file";

type UserData = {
  value: data.User;
  updateAt: Date;
};

type ProjectData = {
  value: data.Project;
  updateAt: Date;
};

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

    dbRequest.onupgradeneeded = (): void => {
      console.log("Databaseのversionが上がった");
      const db = dbRequest.result;
      db.createObjectStore(accessTokenObjectStoreName, {});
      db.createObjectStore(userObjectStoreName, {});
      db.createObjectStore(projectObjectStoreName, {});
      db.createObjectStore(fileObjectStoreName, {});
    };

    dbRequest.onsuccess = (): void => {
      resolve(dbRequest.result);
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
): Promise<undefined | data.AccessToken> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction(
      [accessTokenObjectStoreName],
      "readonly"
    );

    const getRequest = transaction
      .objectStore(accessTokenObjectStoreName)
      .get(accessTokenKeyName);
    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };
    transaction.onerror = (): void => {
      reject("read AccessToken Error: transaction failed");
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
      resolve();
      return;
    }
    const transaction = database.transaction(
      [accessTokenObjectStoreName],
      "readwrite"
    );
    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject("Write AccessToken Error: transaction failed");
    };
    transaction
      .objectStore(accessTokenObjectStoreName)
      .put(accessToken, accessTokenKeyName);
  });

/**
 * ユーザーのデータをindexDBに書き込む
 */
export const getUser = (
  database: IDBDatabase | null,
  userId: data.UserId
): Promise<undefined | data.User> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction([userObjectStoreName], "readonly");

    const getRequest: IDBRequest<UserData> = transaction
      .objectStore(userObjectStoreName)
      .get(userId);
    transaction.oncomplete = (): void => {
      resolve(
        getRequest.result.updateAt.getTime() + 1000 * 30 < new Date().getTime()
          ? getRequest.result.value
          : undefined
      );
    };

    transaction.onerror = (): void => {
      reject("read user failed");
    };
  });

/**
 * ユーザーのデータをindexDBから読み込む
 */
export const setUser = (
  database: IDBDatabase | null,
  userId: data.UserId,
  userData: data.User
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction(
      [userObjectStoreName],
      "readwrite"
    );

    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject("write user error: transaction failed");
    };

    const data: UserData = {
      value: userData,
      updateAt: new Date(),
    };
    transaction.objectStore(userObjectStoreName).put(data, userId);
  });

export const getProject = (
  database: IDBDatabase | null,
  projectId: data.ProjectId
): Promise<null | data.Project> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve(null);
      return;
    }
    const transaction = database.transaction(
      [projectObjectStoreName],
      "readonly"
    );
    const getRequest: IDBRequest<ProjectData> = transaction
      .objectStore(projectObjectStoreName)
      .get(projectId);

    transaction.oncomplete = (): void => {
      resolve(
        getRequest.result.updateAt.getTime() + 1000 * 30 < new Date().getTime()
          ? getRequest.result.value
          : undefined
      );
    };

    transaction.onerror = (): void => {
      reject("read project failed");
    };
  });

export const setProject = (
  database: IDBDatabase | null,
  projectId: data.ProjectId,
  projectData: data.Project
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }

    const transaction = database.transaction(
      [projectObjectStoreName],
      "readwrite"
    );

    transaction.oncomplete = (): void => {
      resolve();
    };

    transaction.onerror = (): void => {
      reject("set project failed");
    };

    const data: ProjectData = {
      value: projectData,
      updateAt: new Date(),
    };
    transaction.objectStore(projectObjectStoreName).put(data, projectId);
  });

/**
 * ファイルのバイナリを読み込む
 */
export const getFile = (
  database: IDBDatabase | null,
  fileHash: data.FileHash
): Promise<undefined | Uint8Array> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction([fileObjectStoreName], "readonly");

    const getRequest: IDBRequest<
      Uint8Array | undefined
    > = transaction.objectStore(fileObjectStoreName).get(fileHash);
    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };
    transaction.onerror = (): void => {
      reject("read image file failed");
    };
  });

/**
 * ファイルのバイナリを書き込む
 */
export const setFile = (
  database: IDBDatabase | null,
  fileHash: data.FileHash,
  image: Uint8Array
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction(fileObjectStoreName, "readwrite");

    transaction.oncomplete = (): void => {
      resolve();
    };

    transaction.onerror = (): void => {
      reject("set image failed");
    };

    transaction.objectStore(fileObjectStoreName).put(image, fileHash);
  });

import { data, util } from "definy-common";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";
const userObjectStoreName = "user";
const projectObjectStoreName = "project";
const fileObjectStoreName = "file";
const ideaObjectStoreName = "idea";

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
      db.createObjectStore(ideaObjectStoreName, {});
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
      resolve(undefined);
      return;
    }
    const transaction = database.transaction(
      [accessTokenObjectStoreName],
      "readonly"
    );

    const getRequest: IDBRequest<
      undefined | data.AccessToken
    > = transaction
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
 * ユーザーのデータをindexedDBから読む
 */
export const getUser = (
  database: IDBDatabase | null,
  userId: data.UserId
): Promise<undefined | data.UserSnapshot> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction([userObjectStoreName], "readonly");

    const getRequest: IDBRequest<
      undefined | data.UserSnapshot
    > = transaction.objectStore(userObjectStoreName).get(userId);
    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };

    transaction.onerror = (): void => {
      reject("read user failed");
    };
  });

/**
 * 指定したユーザーIDのスナップショットがなかった場合, 指定したユーザースナップショットをindexedDBに書く
 * 前にあったユーザースナップショットのgetTimeより新しかった場合, 指定したユーザースナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setUser = (
  database: IDBDatabase | null,
  userId: data.UserId,
  userSnapshot: data.UserSnapshot
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const getTransaction = database.transaction(
      [userObjectStoreName],
      "readonly"
    );
    getTransaction.oncomplete = (): void => {
      if (getRequest.result === undefined) {
        setUserLow(database, userId, userSnapshot).then(resolve);
        return;
      }
      if (
        util.timeToDate(getRequest.result.getTime).getTime() <
        util.timeToDate(userSnapshot.getTime).getTime()
      ) {
        setUserLow(database, userId, userSnapshot).then(resolve);
        return;
      }
      resolve();
    };
    getTransaction.onerror = (): void => {
      reject("write user error: get transaction failed");
    };
    const getRequest: IDBRequest<
      undefined | data.UserSnapshot
    > = getTransaction.objectStore(userObjectStoreName).get(userId);
  });

/**
 * ユーザーのスナップショットを書き込む
 */
const setUserLow = (
  database: IDBDatabase,
  userId: data.UserId,
  userSnapshot: data.UserSnapshot
): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [userObjectStoreName],
      "readwrite"
    );
    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject("write user error: write transaction failed");
    };
    transaction.objectStore(userObjectStoreName).put(userSnapshot, userId);
  });

/**
 * プロジェクトのデータをindexedDBから読む
 */
export const getProject = (
  database: IDBDatabase | null,
  projectId: data.ProjectId
): Promise<undefined | data.ProjectSnapshot> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve(undefined);
      return;
    }
    const transaction = database.transaction(
      [projectObjectStoreName],
      "readonly"
    );
    const getRequest: IDBRequest<
      undefined | data.ProjectSnapshot
    > = transaction.objectStore(projectObjectStoreName).get(projectId);

    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };

    transaction.onerror = (): void => {
      reject("read project failed");
    };
  });

/**
 * プロジェクトのスナップショットをindexedDBに書く
 *
 * 指定したプロジェクトIDのプロジェクトスナップショットがなかった場合, 指定したプロジェクトスナップショットをindexedDBに書く
 * 前にあったプロジェクトスナップショットのgetTimeより新しかった場合, 指定したプロジェクトスナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setProject = (
  database: IDBDatabase | null,
  projectId: data.ProjectId,
  projectSnapshot: data.ProjectSnapshot
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }

    const transaction = database.transaction(
      [projectObjectStoreName],
      "readonly"
    );

    transaction.oncomplete = (): void => {
      if (getRequest.result === undefined) {
        setProjectLow(database, projectId, projectSnapshot).then(resolve);
        return;
      }
      if (
        util.timeToDate(getRequest.result.getTime).getTime() <
        util.timeToDate(projectSnapshot.getTime).getTime()
      ) {
        setProjectLow(database, projectId, projectSnapshot).then(resolve);
        return;
      }
      resolve();
    };

    transaction.onerror = (): void => {
      reject("set project failed");
    };

    const getRequest: IDBRequest<
      undefined | data.ProjectSnapshot
    > = transaction.objectStore(projectObjectStoreName).get(projectId);
  });

/**
 * プロジェクトのスナップショットを書き込む
 */
const setProjectLow = (
  database: IDBDatabase,
  projectId: data.ProjectId,
  projectSnapshot: data.ProjectSnapshot
): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [projectObjectStoreName],
      "readwrite"
    );
    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject("write project error: write transaction failed");
    };
    transaction
      .objectStore(projectObjectStoreName)
      .put(projectSnapshot, projectId);
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

export const getIdea = (
  database: IDBDatabase | null,
  ideaId: data.IdeaId
): Promise<undefined | data.IdeaSnapshot> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction(
      [ideaObjectStoreName],
      "readwrite"
    );

    const getRequest: IDBRequest<
      undefined | data.IdeaSnapshot
    > = transaction.objectStore(ideaObjectStoreName).get(ideaId);

    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };

    transaction.onerror = (): void => {
      reject("read idea failed");
    };
  });

/**
 * アイデアのスナップショットをindexedDBに書く
 *
 * 指定したアイデアIDのアイデアスナップショットがなかった場合, 指定したアイデアスナップショットをindexedDBに書く
 * 前にあったアイデアスナップショットのgetTimeより新しかった場合, 指定したアイデアスナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setIdea = (
  database: IDBDatabase | null,
  ideaSnapshotAndId: data.IdeaSnapshotAndId
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }

    const transaction = database.transaction([ideaObjectStoreName], "readonly");

    transaction.oncomplete = (): void => {
      if (getRequest.result === undefined) {
        setIdeaLow(database, ideaSnapshotAndId).then(resolve);
        return;
      }
      if (
        util.timeToDate(getRequest.result.getTime).getTime() <
        util.timeToDate(ideaSnapshotAndId.snapshot.getTime).getTime()
      ) {
        setIdeaLow(database, ideaSnapshotAndId).then(resolve);
        return;
      }
      resolve();
    };

    transaction.onerror = (): void => {
      reject("set idea failed");
    };

    const getRequest: IDBRequest<
      undefined | data.ProjectSnapshot
    > = transaction.objectStore(ideaObjectStoreName).get(ideaSnapshotAndId.id);
  });

/**
 * アイデアのスナップショットを書き込む
 */
const setIdeaLow = (
  database: IDBDatabase,
  ideaSnapshotAndId: data.IdeaSnapshotAndId
): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [ideaObjectStoreName],
      "readwrite"
    );
    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject("write idea error:  write transaction failed");
    };
    transaction
      .objectStore(ideaObjectStoreName)
      .put(ideaSnapshotAndId.snapshot, ideaSnapshotAndId.id);
  });

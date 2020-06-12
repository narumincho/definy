import { data as commonData, util } from "definy-common";

const accessTokenObjectStoreName = "accessToken";
const accessTokenKeyName = "lastLogInUser";
const userObjectStoreName = "user";
const projectObjectStoreName = "project";
const fileObjectStoreName = "file";
const ideaObjectStoreName = "idea";
const suggestionObjectStoreName = "suggestion";
const partObjectStoreName = "part";
const typePartObjectStoreName = "typePart";

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
      db.createObjectStore(suggestionObjectStoreName, {});
      db.createObjectStore(partObjectStoreName, {});
      db.createObjectStore(typePartObjectStoreName, {});
    };

    dbRequest.onsuccess = (): void => {
      resolve(dbRequest.result);
    };

    dbRequest.onerror = (): void => {
      console.log("Databaseに接続できなかった");
      reject(new Error("Databaseに接続できなかった"));
    };
  });

/**
 * IndexDBからアクセストークンを取得する
 */
export const getAccessToken = (
  database: IDBDatabase | null
): Promise<undefined | commonData.AccessToken> =>
  get<typeof accessTokenKeyName, commonData.AccessToken>(
    database,
    accessTokenObjectStoreName,
    accessTokenKeyName
  );

/**
 * IndexDBにアクセストークンを書き込む
 * @param database nullだった場合サポートされていないとみなされ常に何も取得できない
 * @param accessToken アクセストークン
 */
export const setAccessToken = (
  database: IDBDatabase | null,
  accessToken: commonData.AccessToken
): Promise<void> =>
  setLow<typeof accessTokenKeyName, commonData.AccessToken>(
    database,
    accessTokenObjectStoreName,
    accessTokenKeyName,
    accessToken
  );

/**
 * ユーザーのデータをindexedDBから読む
 */
export const getUser = (
  database: IDBDatabase | null,
  userId: commonData.UserId
): Promise<undefined | commonData.UserSnapshot> =>
  get<commonData.UserId, commonData.UserSnapshot>(
    database,
    userObjectStoreName,
    userId
  );

/**
 * 指定したユーザーIDのスナップショットがなかった場合, 指定したユーザースナップショットをindexedDBに書く
 * 前にあったユーザースナップショットのgetTimeより新しかった場合, 指定したユーザースナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setUser = (
  database: IDBDatabase | null,
  userId: commonData.UserId,
  userSnapshot: commonData.UserSnapshot
): Promise<void> =>
  set<commonData.UserId, commonData.UserSnapshot>(
    database,
    userObjectStoreName,
    userId,
    userSnapshot
  );

/**
 * プロジェクトのデータをindexedDBから読む
 */
export const getProject = (
  database: IDBDatabase | null,
  projectId: commonData.ProjectId
): Promise<undefined | commonData.ProjectSnapshot> =>
  get<commonData.ProjectId, commonData.ProjectSnapshot>(
    database,
    projectObjectStoreName,
    projectId
  );

/**
 * プロジェクトのスナップショットをindexedDBに書く
 *
 * 指定したプロジェクトIDのプロジェクトスナップショットがなかった場合, 指定したプロジェクトスナップショットをindexedDBに書く
 * 前にあったプロジェクトスナップショットのgetTimeより新しかった場合, 指定したプロジェクトスナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setProject = (
  database: IDBDatabase | null,
  projectId: commonData.ProjectId,
  projectSnapshot: commonData.ProjectSnapshot
): Promise<void> =>
  set<commonData.ProjectId, commonData.ProjectSnapshot>(
    database,
    projectObjectStoreName,
    projectId,
    projectSnapshot
  );

/**
 * ファイルのバイナリを読み込む
 */
export const getImage = (
  database: IDBDatabase | null,
  imageToken: commonData.ImageToken
): Promise<undefined | Uint8Array> =>
  get<commonData.ImageToken, Uint8Array>(
    database,
    fileObjectStoreName,
    imageToken
  );

/**
 * ファイルのバイナリを書き込む
 */
export const setImage = (
  database: IDBDatabase | null,
  imageToken: commonData.ImageToken,
  image: Uint8Array
): Promise<void> =>
  setLow<commonData.ImageToken, Uint8Array>(
    database,
    fileObjectStoreName,
    imageToken,
    image
  );

export const getIdea = (
  database: IDBDatabase | null,
  ideaId: commonData.IdeaId
): Promise<undefined | commonData.IdeaSnapshot> =>
  get<commonData.IdeaId, commonData.IdeaSnapshot>(
    database,
    ideaObjectStoreName,
    ideaId
  );

/**
 * アイデアのスナップショットをindexedDBに書く
 *
 * 指定したアイデアIDのアイデアスナップショットがなかった場合, 指定したアイデアスナップショットをindexedDBに書く
 * 前にあったアイデアスナップショットのgetTimeより新しかった場合, 指定したアイデアスナップショットをindexedDBに書く
 * そうでなければ何もしない
 */
export const setIdea = (
  database: IDBDatabase | null,
  id: commonData.IdeaId,
  snapshot: commonData.IdeaSnapshot
): Promise<void> =>
  set<commonData.IdeaId, commonData.IdeaSnapshot>(
    database,
    ideaObjectStoreName,
    id,
    snapshot
  );

export const getSuggestion = (
  database: IDBDatabase | null,
  id: commonData.SuggestionId
): Promise<commonData.SuggestionSnapshot | undefined> =>
  get<commonData.SuggestionId, commonData.SuggestionSnapshot>(
    database,
    suggestionObjectStoreName,
    id
  );

export const setSuggestion = (
  database: IDBDatabase | null,
  id: commonData.SuggestionId,
  snapshot: commonData.SuggestionSnapshot
): Promise<void> =>
  set<commonData.SuggestionId, commonData.SuggestionSnapshot>(
    database,
    suggestionObjectStoreName,
    id,
    snapshot
  );

export const getPart = (
  database: IDBDatabase | null,
  id: commonData.PartId
): Promise<commonData.PartSnapshot | undefined> =>
  get<commonData.PartId, commonData.PartSnapshot>(
    database,
    partObjectStoreName,
    id
  );

export const setPart = (
  database: IDBDatabase | null,
  id: commonData.PartId,
  snapshot: commonData.PartSnapshot
): Promise<void> =>
  set<commonData.PartId, commonData.PartSnapshot>(
    database,
    partObjectStoreName,
    id,
    snapshot
  );

export const getTypePart = (
  database: IDBDatabase | null,
  id: commonData.TypePartId
): Promise<commonData.TypePartSnapshot | undefined> =>
  get<commonData.TypePartId, commonData.TypePartSnapshot>(
    database,
    typePartObjectStoreName,
    id
  );

export const setTypePart = (
  database: IDBDatabase | null,
  id: commonData.TypePartId,
  snapshot: commonData.TypePartSnapshot
): Promise<void> =>
  set<commonData.TypePartId, commonData.TypePartSnapshot>(
    database,
    typePartObjectStoreName,
    id,
    snapshot
  );

const get = <id extends string, data>(
  database: IDBDatabase | null,
  objectStoreName: string,
  id: id
): Promise<data | undefined> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }
    const transaction = database.transaction([objectStoreName], "readwrite");

    transaction.oncomplete = (): void => {
      resolve(getRequest.result);
    };

    transaction.onerror = (): void => {
      reject(new Error(`read ${objectStoreName} failed`));
    };

    const getRequest: IDBRequest<data | undefined> = transaction
      .objectStore(objectStoreName)
      .get(id);
  });

/**
 * データをindexedDBに書く
 *
 * 指定したIDのデータがなかった場合, 指定したデータをindexedDBに書く
 * 指定したデータのgetTimeが 前にあったデータのgetTimeより新しかった場合, 指定したデータをindexedDBに書く
 * そうでなければ何もしない
 */
const set = <id extends string, data extends { getTime: commonData.Time }>(
  database: IDBDatabase | null,
  objectStoreName: string,
  id: id,
  data: data
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (database === null) {
      resolve();
      return;
    }

    const transaction = database.transaction([objectStoreName], "readonly");

    transaction.oncomplete = (): void => {
      if (getRequest.result === undefined) {
        setLow(database, objectStoreName, id, data).then(resolve);
        return;
      }
      if (
        util.timeToDate(getRequest.result.getTime).getTime() <
        util.timeToDate(data.getTime).getTime()
      ) {
        setLow(database, objectStoreName, id, data).then(resolve);
        return;
      }
      resolve();
    };

    transaction.onerror = (): void => {
      reject(new Error(`set before get getTime ${objectStoreName} failed`));
    };

    const getRequest: IDBRequest<undefined | data> = transaction
      .objectStore(objectStoreName)
      .get(id);
  });

const setLow = <id extends string, data>(
  database: IDBDatabase | null,
  objectStoreName: string,
  id: id,
  data: data
): Promise<void> =>
  new Promise((resolve, reject) => {
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
        new Error(`write ${objectStoreName} error: write transaction failed`)
      );
    };

    transaction.objectStore(objectStoreName).put(data, id);
  });

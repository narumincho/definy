import * as admin from "firebase-admin";
import * as type from "./type";
import * as firestore from "@google-cloud/firestore";

const app = admin.initializeApp();
const dataBase = app.firestore();
const storage = app.storage();
const userImageBucket = storage.bucket("definy-user-image");

const userCollection = dataBase.collection("user");
const collectionFromLogInState = (
    logInService: type.LogInService
): FirebaseFirestore.CollectionReference => {
    switch (logInService) {
        case "google":
            return dataBase.collection("googleState");
        case "gitHub":
            return dataBase.collection("gitHubState");
        case "line":
            return dataBase.collection("lineState");
    }
};
const projectCollection = dataBase.collection("project");

/* ==========================================
                    User
   ==========================================
*/
export type UserData = {
    name: type.UserName;
    imageId: type.ImageId;
    introduction: string;
    createdAt: firestore.Timestamp;
    leaderProjects: Array<type.ProjectId>;
    editingProjects: Array<type.ProjectId>;
    lastAccessTokenJti: string;
};

/**
 * ユーザーのデータを追加する
 * @param userData ユーザー情報
 * @returns ユーザーのID
 */
export const addUser = async (userData: UserData): Promise<type.UserId> => {
    const userId = type.createRandomId() as type.UserId;
    await userCollection.doc(userId).set(userData);
    return userId;
};

/**
 * ユーザーのデータを取得する
 * @param userId
 */
export const getUserData = async (userId: type.UserId): Promise<UserData> => {
    const userData = (await userCollection.doc(userId).get()).data();
    if (userData === undefined) {
        throw new Error(`There was no user with userId = ${userId}`);
    }
    return userData as UserData;
};

/**
 * 全てのユーザーのデータを取得する
 */
export const getAllUserData = async (): Promise<
    Array<{ id: type.UserId; data: UserData }>
> =>
    (await userCollection.get()).docs.map(doc => ({
        id: doc.id as type.UserId,
        data: doc.data() as UserData
    }));

/**
 * Firebase Cloud Storageのバケット "definy-user-image" で新しくファイルを作成する
 */
export const saveUserImage = async (
    fileName: string,
    buffer: Buffer,
    mimeType: string
): Promise<void> => {
    const file = userImageBucket.file(fileName);
    await file.save(buffer, { contentType: mimeType });
};

/* ==========================================
                Log In
   ==========================================
*/
/**
 * ソーシャルログイン stateを保存する
 */
export const writeGoogleLogInState = async (
    logInService: type.LogInService,
    state: string
): Promise<void> => {
    await collectionFromLogInState(logInService)
        .doc(state)
        .create({});
};

/**
 * ソーシャルログイン stateが存在することを確認し、存在するなら削除する
 */
export const existsGoogleStateAndDeleteAndGetUserId = async (
    logInService: type.LogInService,
    state: string
): Promise<boolean> => {
    const docRef = collectionFromLogInState(logInService).doc(state);
    const data = (await docRef.get()).data();
    if (data === undefined) {
        return false;
    }
    await docRef.delete();
    return true;
};

/* ==========================================
                Project
   ==========================================
*/
export type ProjectData = {
    name: type.Label;
    leaderId: type.UserId;
    editorsId: Array<type.UserId>;
    createdAt: firestore.Timestamp;
    updateAt: firestore.Timestamp;
    modulesId: Array<type.ModuleId>;
};

export const addProject = async (
    data: ProjectData
): Promise<type.ProjectId> => {
    const projectId = type.createRandomId() as type.ProjectId;
    await projectCollection.doc(projectId).set(data);
    return projectId;
};

/**
 * Idで指定したプロジェクトのデータを取得する
 */
export const getProject = async (
    projectId: type.ProjectId
): Promise<ProjectData> => {
    const projectData = (await projectCollection.doc(projectId).get()).data();
    if (projectData === undefined) {
        throw new Error(`There was no project with projectId = ${projectId}`);
    }
    return projectData as ProjectData;
};

/**
 * 全てのプロジェクトのデータを取得する
 */
export const getAllProject = async (): Promise<
    Array<{ id: type.ProjectId; data: ProjectData }>
> =>
    (await projectCollection.get()).docs.map(doc => ({
        id: doc.id as type.ProjectId,
        data: doc.data() as ProjectData
    }));
/* ==========================================
                Timestamp
   ==========================================
*/
/**
 * 今の時刻のタイムスタンプを得る
 */
export const getNowTimestamp = (): firestore.Timestamp =>
    admin.firestore.Timestamp.now();

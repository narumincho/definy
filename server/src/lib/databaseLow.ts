import * as admin from "firebase-admin";
import * as type from "./type";
import * as firestore from "@google-cloud/firestore";
import * as stream from "stream";

const app = admin.initializeApp();
const dataBase = app.firestore();
const storage = app.storage();
const userImageBucket = storage.bucket("definy-user-image");
const projectBucket = storage.bucket("definy-project");

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
const releaseProjectCollection = (
    projectId: type.ProjectId,
    version: type.Version
) =>
    projectCollection
        .doc(projectId)
        .collection("release")
        .doc(`v${version.major}.${version.minor}.${version.patch}`);

const preReleaseProjectCollection = (
    projectId: type.ProjectId,
    preReleaseProjectId: type.ReleaseProjectId
) =>
    projectCollection
        .doc(projectId)
        .collection("preRelease")
        .doc(preReleaseProjectId);

const moduleCollection = dataBase.collection("module");
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
    logInServiceAndId: type.LogInServiceAndId;
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
export const getUser = async (userId: type.UserId): Promise<UserData> => {
    const userData = (await userCollection.doc(userId).get()).data();
    if (userData === undefined) {
        throw new Error(`There was no user with userId = ${userId}`);
    }
    return userData as UserData;
};

/**
 * 全てのユーザーのデータを取得する
 */
export const getAllUser = async (): Promise<
    Array<{ id: type.UserId; data: UserData }>
> =>
    (await userCollection.get()).docs.map(doc => ({
        id: doc.id as type.UserId,
        data: doc.data() as UserData
    }));

export const searchUsers = async <T extends keyof UserData>(
    filed: T,
    operator: firestore.WhereFilterOp,
    value: UserData[T]
): Promise<Array<{ id: type.UserId; data: UserData }>> =>
    (await userCollection.where(filed, operator, value).get()).docs.map(
        doc => ({ id: doc.id as type.UserId, data: doc.data() as UserData })
    );

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

/**
 * Firebase Cloud Storageのバケット "definy-user-image" のファイルを読み込むReadable Streamを取得する
 * @param fileId ファイルID
 */
export const getUserImageReadableStream = (fileId: string): stream.Readable =>
    userImageBucket.file(fileId).createReadStream();

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
    masterBranch: type.BranchId;
    branches: Array<type.BranchId>;
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
                Branch
   ==========================================
*/
export type BranchData = {
    name: type.Label;
    description: string;
    head: type.CommitId;
};

export type CommitData = {
    parentCommitIds: Array<type.CommitId>;
    tag: null | string | type.Version;
    projectName: string;
    projectDescription: string;
    author: type.UserId;
    date: firestore.Timestamp;
    commitSummary: string;
    commitDescription: string;
    typeData: Array<{
        typeId: type.TypeId;
        moduleId: type.ModuleId;
        name: type.Label;
        typeBody: type.TypeBodyId;
    }>;
    partData: Array<{
        partId: type.PartId;
        moduleId: type.ModuleId;
        name: type.Label;
        type: type.Type;
        expr: type.ExprId;
    }>;
    modules: Array<type.ModuleId>;
    dependencies: Array<{
        projectId: type.ProjectId;
        version: type.DependencyVersion;
    }>;
};

/* ==========================================
                Module
   ==========================================
*/
export type ModuleData = {
    name: Array<type.Label>;
    createdAt: firestore.Timestamp;
    updateAt: firestore.Timestamp;
    description: string;
};

export const addModule = async (data: ModuleData): Promise<type.ModuleId> => {
    const moduleId = type.createRandomId() as type.ModuleId;
    await moduleCollection.doc(moduleId).set(data);
    return moduleId;
};

export const getModule = async (
    moduleId: type.ModuleId
): Promise<ModuleData> => {
    const moduleData = (await moduleCollection.doc(moduleId).get()).data();
    if (moduleData === undefined) {
        throw new Error(`There was no module with moduleId = ${moduleId}`);
    }
    return moduleData as ModuleData;
};

export const getAllModule = async (): Promise<
    Array<{ id: type.ModuleId; data: ModuleData }>
> =>
    (await moduleCollection.get()).docs.map(doc => ({
        id: doc.id as type.ModuleId,
        data: doc.data() as ModuleData
    }));
/* ==========================================
                Type Definition
   ==========================================
*/

export type TypeData = {
    name: type.Label;
};

/* ==========================================
                Timestamp
   ==========================================
*/
/**
 * 今の時刻のタイムスタンプを得る
 */
export const getNowTimestamp = (): firestore.Timestamp =>
    admin.firestore.Timestamp.now();

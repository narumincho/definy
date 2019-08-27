import * as admin from "firebase-admin";
import * as type from "./type";
import * as firestore from "@google-cloud/firestore";
import * as stream from "stream";
import * as crypto from "crypto";

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

const moduleCollection = dataBase.collection("module");
const branchCollection = dataBase.collection("branch");
const commitCollection = dataBase.collection("commit");
const typeCollection = dataBase.collection("type");
const partCollection = dataBase.collection("part");
const exprCollection = dataBase.collection("expr");
/* ==========================================
                    User
   ==========================================
*/
export type UserData = {
    name: type.UserName;
    imageId: type.ImageId;
    introduction: string;
    createdAt: firestore.Timestamp;
    branches: Array<type.Branch>;
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

// コレクションはProject。KeyはProjectId
export type ProjectData = {
    masterBranch: type.BranchId;
    branches: Array<type.BranchId>;
};

export const addProject = async (
    data: ProjectData
): Promise<type.ProjectId> => {
    const projectId = type.createRandomId() as type.ProjectId;
    await projectCollection.doc(projectId).create(data);
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
 * プロジェクトのデータを変更する
 */
export const updateProject = async (
    projectId: type.ProjectId,
    projectData: Partial<ProjectData>
): Promise<void> => {
    await projectCollection.doc(projectId).update(projectData);
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

// コレクションはbranch。KeyはBranchId
export type BranchData = {
    name: type.Label;
    projectId: type.ProjectId;
    description: string;
    head: type.CommitObjectHash;
};

/**
 * ブランチを作成する
 * @param data
 */
export const addBranch = async (data: BranchData): Promise<type.BranchId> => {
    const branchId = type.createRandomId() as type.BranchId;
    await branchCollection.doc(branchId).create(data);
    return branchId;
};

/**
 * ブランチを取得する
 */
export const getBranch = async (id: type.BranchId): Promise<BranchData> => {
    const branchData = (await branchCollection.doc(id).get()).data();
    if (branchData === undefined) {
        throw new Error(`There was no branch with branchId = ${id}`);
    }
    return branchData as BranchData;
};

/**
 * ブランチを更新する
 */
export const updateBranch = async (
    id: type.BranchId,
    data: Partial<BranchData>
): Promise<void> => {
    await branchCollection.doc(id).update(data);
};
/* ==========================================
                Commit
   ==========================================
*/

// コレクションはcommit。一度作成したら変更しない。KeyはJSONに変換したときのSHA-256でのハッシュ値
export type CommitData = {
    parentCommitIds: Array<type.CommitObjectHash>;
    tag: null | string | type.Version;
    projectName: string;
    projectDescription: string;
    author: type.UserId;
    date: firestore.Timestamp;
    commitSummary: string;
    commitDescription: string;
    treeModuleId: type.ModuleId;
    tree: type.ModuleSnapshotHash;
    dependencies: Array<{
        projectId: type.ProjectId;
        version: type.DependencyVersion;
    }>;
};

/**
 * コミットを作成する。存在するものをさらに作成したらエラー
 */
export const addCommit = async (
    data: CommitData
): Promise<type.CommitObjectHash> => {
    const hash = createHash(data);
    await commitCollection.doc(hash).create(data);
    return hash as type.CommitObjectHash;
};

/**
 * コミットを取得する
 */
export const getCommit = async (
    hash: type.CommitObjectHash
): Promise<CommitData> => {
    const commitData = (await commitCollection.doc(hash).get()).data();
    if (commitData === undefined) {
        throw new Error(`There was no commit with commitHash = ${hash}`);
    }
    return commitData as CommitData;
};
/* ==========================================
            Module (スナップショット)
   ==========================================
*/

// コレクションはmodule。一度作成したら変更しない。KeyはJSONに変換したときのSHA-256でのハッシュ値
export type ModuleSnapshotData = {
    name: type.Label | null; // 直下のときはnull
    childModule: { [key in type.ModuleId]: type.ModuleSnapshotHash };
    typeDefs: { [key in type.TypeId]: type.TypeDefSnapshotHash };
    partDefs: { [key in type.PartId]: type.PartDefSnapshotHash };
    description: string;
    exposing: boolean;
};

/**
 * モジュールのスナップショットを作成する。存在するものをさらに追加しようとしたら何もしない。
 */
export const addModuleSnapshot = async (
    data: ModuleSnapshotData
): Promise<type.ModuleSnapshotHash> => {
    const hash = createHash(data) as type.ModuleSnapshotHash;
    if ((await moduleCollection.doc(hash).get()).exists) {
        return hash;
    }
    await moduleCollection.doc(hash).create(data);
    return hash;
};

/**
 * モジュールのスナップショットを取得する
 */
export const getModuleSnapshot = async (
    hash: type.ModuleSnapshotHash
): Promise<ModuleSnapshotData> => {
    const moduleData = (await moduleCollection.doc(hash).get()).data();
    if (moduleData === undefined) {
        throw new Error(`There was no module snapshot with hash = ${hash}`);
    }
    return moduleData as ModuleSnapshotData;
};

/* ==========================================
            Type Def (スナップショット)
   ==========================================
*/

// コレクションはtype。ー度作成したら変更しない。KeyはJSONに変換したときのSHA-256でのハッシュ値
export type TypeDefSnapshot = {
    moduleId: type.ModuleId;
    name: type.Label;
    description: string;
    typeBody:
        | {
              type: "tag";
              tags: Array<{ name: type.Label; parameter: Array<type.Type> }>;
          }
        | { type: "kernel"; kernelType: type.KernelType };
};

/**
 * 型定義のスナップショットを作成する。存在するものをさらに追加しようとしたら何もしない。
 */
export const addTypeDefSnapshot = async (
    data: TypeDefSnapshot
): Promise<type.TypeDefSnapshotHash> => {
    const hash = createHash(data) as type.TypeDefSnapshotHash;
    if ((await typeCollection.doc(hash).get()).exists) {
        return hash;
    }
    await typeCollection.doc(hash).create(data);
    return hash;
};

/**
 * 型定義のスナップショットを取得する
 */
export const getTypeDefSnapshot = async (
    hash: type.TypeDefSnapshotHash
): Promise<TypeDefSnapshot> => {
    const typeDefSnapshot = (await typeCollection.doc(hash).get()).data();
    if (typeDefSnapshot === undefined) {
        throw new Error(`There was no typeDef snapshot with hash = ${hash}`);
    }
    return typeDefSnapshot as TypeDefSnapshot;
};
/* ==========================================
            Part Def (スナップショット)
   ==========================================
*/

// コレクションはpart。ー度作成したら変更しない。KeyはJSONに変換したときのSHA-256でのハッシュ値
export type PartDefSnapshot = {
    moduleId: type.ModuleId;
    name: type.Label;
    description: string;
    type: Array<type.Type>;
    expr: type.ExprSnapshotHash;
};

/**
 * パーツ定義のスナップショットを作成する。存在するものをさらに追加しようとしたら何もしない。
 */
export const addPartDefSnapshot = async (
    data: PartDefSnapshot
): Promise<type.PartDefSnapshotHash> => {
    const hash = createHash(data) as type.PartDefSnapshotHash;
    if ((await partCollection.doc(hash).get()).exists) {
        return hash;
    }
    await partCollection.doc(hash).create(data);
    return hash;
};

/**
 * パーツ定義のスナップショットを取得する
 */
export const getPartDefSnapShot = async (
    hash: type.PartDefSnapshotHash
): Promise<PartDefSnapshot> => {
    const partDefSnapshot = (await partCollection.doc(hash).get()).data();
    if (partDefSnapshot === undefined) {
        throw new Error(`There was no partDef snapshot with hash = ${hash}`);
    }
    return partDefSnapshot as PartDefSnapshot;
};
/* ==========================================
            Expr (スナップショット)
   ==========================================
*/

// コレクションはexpr。ー度作成したら変更しない。KeyはJSONに変換したときのSHA-256でのハッシュ値
export type ExprSnapshot = {
    value: Array<type.TermOrParenthesis>;
};

/**
 * 式のスナップショットを作成する。存在するものをさらに追加しようとしたら何もしない。
 */
export const addExprSnapshot = async (
    data: ExprSnapshot
): Promise<type.ExprSnapshotHash> => {
    const hash = createHash(data) as type.ExprSnapshotHash;
    if ((await exprCollection.doc(hash).get()).exists) {
        return hash;
    }
    await exprCollection.doc(hash).create(data);
    return hash;
};

/**
 * 式のスナップショットを取得する
 */
export const getExprSnapshot = async (
    hash: type.ExprSnapshotHash
): Promise<ExprSnapshot> => {
    const exprSnapshot = (await exprCollection.doc(hash).get()).data();
    if (exprSnapshot === undefined) {
        throw new Error(`There was no expr snapshot with hash = ${hash}`);
    }
    return exprSnapshot as ExprSnapshot;
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

/* ==========================================
                SHA-256 Hash
   ==========================================
*/
const createHash = (data: unknown): string =>
    crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");

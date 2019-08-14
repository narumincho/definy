import * as admin from "firebase-admin";
import * as type from "./type";

const app = admin.initializeApp();
const dataBase = app.firestore();
const storage = app.storage();
const userImageBucket = storage.bucket("definy-user-image");

const dataBaseUserCollection = dataBase.collection("user");
const googleStateCollection = dataBase.collection("googleState");
const gitHubStateCollection = dataBase.collection("gitHubState");
const lineStateCollection = dataBase.collection("lineState");

export type UserData = {
    id: string;
    name: type.Label;
    image: type.Image;
    createdAt: Date;
    leaderProjects: Array<type.Id>;
    editingProjects: Array<type.Id>;
};

/**
 * Googleへのstateが存在することを確認し、存在するなら削除する
 */
export const existsGoogleStateAndDeleteAndGetUserId = async (
    state: string
): Promise<boolean> => {
    const docRef = googleStateCollection.doc(state);
    const data = (await docRef.get()).data();
    if (data === undefined) {
        return false;
    }
    await docRef.delete();
    return true;
};

/**
 * GitHubへのstateが存在することを確認し、存在するなら削除する
 */
export const existsGitHubStateAndDeleteAndGetUserId = async (
    state: string
): Promise<string | null> => {
    const docRef = gitHubStateCollection.doc(state);
    const data = (await docRef.get()).data();
    if (data === undefined) {
        return null;
    }
    await docRef.delete();
    return data.userId;
};

/**
 * LINEへのstateが存在することを確認し、存在するなら削除する
 */
export const existsLineStateAndDeleteAndGetUserId = async (
    state: string
): Promise<string | null> => {
    const docRef = lineStateCollection.doc(state);
    const data = (await docRef.get()).data();
    if (data === undefined) {
        return null;
    }
    await docRef.delete();
    return data.userId;
};

/**
 * Firebase Cloud Storageのバケット "definy-user-image" で新しくファイルを作成する
 */
export const saveFileToCloudStorageUserImage = async (
    fileName: string,
    buffer: Buffer,
    mimeType: string
): Promise<void> => {
    const file = userImageBucket.file(fileName);
    await file.save(buffer, { contentType: mimeType });
};

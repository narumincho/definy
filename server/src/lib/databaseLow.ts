import * as admin from "firebase-admin";
import * as type from "./type";

const app = admin.initializeApp();
const dataBase = app.firestore();
const storage = app.storage();
const userImageBucket = storage.bucket("definy-user-image");

const dataBaseUserCollection = dataBase.collection("user");
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

export type UserData = {
    id: string;
    name: type.Label;
    image: type.Image;
    createdAt: Date;
    leaderProjects: Array<type.Id>;
    editingProjects: Array<type.Id>;
};

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

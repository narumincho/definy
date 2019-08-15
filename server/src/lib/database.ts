import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";
import * as tool from "./tool";

/**
 * OpenId ConnectのStateを生成して保存する
 * リプレイアタックを防いだり、他のサーバーがつくマートのクライアントIDを使って発行しても自分が発行したものと見比べて識別できるようにする
 */
export const generateAndWriteLogInState = async (
    logInService: type.LogInService
): Promise<string> => {
    const state = tool.createRandomString();
    await databaseLow.writeGoogleLogInState(logInService, state);
    return state;
};

/**
 * 指定したサービスのtateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsAndDeleteState = async (
    logInService: type.LogInService,
    state: string
): Promise<boolean> =>
    await databaseLow.existsGoogleStateAndDeleteAndGetUserId(
        logInService,
        state
    );

/**
 * ユーザーの画像をURLから保存する
 * @param userId ユーザーID
 * @param url 画像を配信しているURL
 */
export const saveUserImageFromUrl = async (url: URL): Promise<string> => {
    const response: AxiosResponse<Buffer> = await axios.get(url.toString(), {
        responseType: "arraybuffer"
    });
    const mimeType: string = response.headers["content-type"];
    const fileName = type.createRandomId();
    await databaseLow.saveUserImage(fileName, response.data, mimeType);
    return fileName;
};

/**
 * TODO ユーザーが存在するときの処理
 * ソーシャルログインのアカウントからユーザーを取得する
 * @param logInServiceAndId
 */
export const getUserFromLogInService = (
    logInServiceAndId: type.LogInServiceAndId
): type.User & { lastAccessTokenJti: string } | null => {
    return null;
};

type UserLowCost = {
    id: type.UserId;
    name: type.UserName;
    image: {
        id: type.ImageId;
    };
    introduction: string;
    createdAt: Date;
    leaderProjects: Array<{ id: type.ProjectId }>;
    editingProjects: Array<{ id: type.ProjectId }>;
};

/**
 * ユーザーを追加する
 */
export const addUser = async (data: {
    name: type.UserName;
    imageId: type.ImageId;
    logInServiceAndId: type.LogInServiceAndId;
    lastAccessTokenJti: string;
}): Promise<string> => {
    const userId = await databaseLow.addUser({
        name: data.name,
        imageId: data.imageId,
        introduction: "",
        editingProjects: [],
        leaderProjects: [],
        createdAt: databaseLow.getNowTimestamp()
    });
    return userId;
};

/**
 * ユーザーの情報を取得する
 * @param userId
 */
export const getUser = async (userId: type.UserId): Promise<UserLowCost> =>
    databaseLowUserToLowCost(userId, await databaseLow.getUserData(userId));

const databaseLowUserToLowCost = (
    userId: type.UserId,
    userData: databaseLow.UserData
): UserLowCost => {
    return {
        id: userId,
        name: userData.name,
        image: {
            id: userData.imageId
        },
        introduction: userData.introduction,
        createdAt: userData.createdAt.toDate(),
        editingProjects: userData.editingProjects.map(id => ({ id: id })),
        leaderProjects: userData.leaderProjects.map(id => ({ id: id }))
    };
};

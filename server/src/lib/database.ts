import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";

/**
 * OpenId ConnectのStateを生成して保存する
 * リプレイアタックを防いだり、他のサーバーがつくマートのクライアントIDを使って発行しても自分が発行したものと見比べて識別できるようにする
 */
export const generateAndWriteLogInState = async (
    logInService: type.LogInService
): Promise<string> => {
    const state = type.createRandomId();
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
    await databaseLow.saveFileToCloudStorageUserImage(
        fileName,
        response.data,
        mimeType
    );
    return fileName;
};

/**
 * TODO
 * ユーザーを追加する
 * @param data
 */
export const addUser = async (data: {
    name: string;
    imageId: string;
    logInServiceAndId: type.LogInServiceAndId;
    lastAccessTokenJti: string;
}): Promise<string> => {
    return type.createRandomId();
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

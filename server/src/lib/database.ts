import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";

/**
 * 指定したGoogleログインのstateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsGoogleState = async (state: string): Promise<boolean> =>
    databaseLow.existsGoogleStateAndDeleteAndGetUserId(state);

/**
 * 指定したGitHubログインのstateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsGitHubState = async (
    state: string
): Promise<string | null> =>
    databaseLow.existsGitHubStateAndDeleteAndGetUserId(state);
/**
 * 指定したLINEログインのstateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsLineState = async (
    state: string
): Promise<string | null> =>
    databaseLow.existsLineStateAndDeleteAndGetUserId(state);

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
